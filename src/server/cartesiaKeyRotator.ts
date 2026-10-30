/**
 * Cartesia API Key Pool & Auto-Rotator with Intelligent Failover
 * Supports dynamic environment keys (CARTESIA_API_KEY_1..N, CARTESIA_API_KEYS, CARTESIA_API_KEY),
 * client-provided keys, character usage tracking, and automatic failover on 429/402 quota exhaustion.
 */

import { db } from '../lib/firebase';
import { doc, setDoc, getDoc, collection, getDocs } from 'firebase/firestore';

export interface KeyPoolItem {
  id: string;
  index: number;
  label: string;
  maskedKey: string;
  source: 'env' | 'custom';
  charCountUsed: number;
  maxCharsLimit: number;
  status: 'active' | 'standby' | 'exhausted' | 'rate_limited' | 'error';
  lastUsedAt: string | null;
  errorMessage?: string;
  accountEmail?: string;
  accountDetails?: string;
  customVoicesCount?: number;
  adminKeyMasked?: string;
  cachedCredits?: any;
}

class CartesiaKeyRotator {
  private keys: {
    rawKey: string;
    item: KeyPoolItem;
  }[] = [];

  private paidKey: {
    rawKey: string;
    item: KeyPoolItem;
  } | null = null;

  // In-memory / persistent account details map keyed by index or 'paid'
  private accountDetailsMap: Map<string, { email: string; details?: string }> = new Map();

  // Admin Keys map for querying Cartesia live credits
  private adminKeysMap: Map<number | string, { rawKey: string; cachedCredits?: any }> = new Map();

  // Real Cartesia custom cloned characters per key (verified live upstream)
  private keyVoicesMap: Map<number | 'paid', any[]> = new Map();

  private activeKeyIndex: number = 0;
  private readonly DEFAULT_LIMIT = 19500; // Auto-rotate threshold at 19,500 chars (safe under 20k free quota)

  constructor() {
    this.reloadEnvironmentKeys();
    // Async refresh custom voices and Firestore usage stats
    this.init().catch((err) => console.warn('Rotator init warning:', err));
  }

  private async init() {
    await this.loadUsageFromFirestore();
    await this.refreshVoiceCounts();
  }

  /**
   * Helper to run Firestore operations with retries
   */
  private async withRetry<T>(operation: () => Promise<T>, label: string, maxRetries = 3): Promise<T | null> {
    let lastErr: any = null;
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (err) {
        lastErr = err;
        const isTransient = (err as any)?.code === 14 || (err as any)?.message?.includes('UNAVAILABLE') || (err as any)?.message?.includes('ECONNRESET');
        if (isTransient && i < maxRetries - 1) {
          const delay = Math.pow(2, i) * 1000;
          console.warn(`[KeyRotator] ${label} failed (attempt ${i + 1}/${maxRetries}), retrying in ${delay}ms...`, err);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        break;
      }
    }
    console.warn(`[KeyRotator] ${label} failed after ${maxRetries} attempts:`, lastErr);
    return null;
  }

  /**
   * Load character usage counts from Firestore to ensure persistence across server restarts
   */
  private async loadUsageFromFirestore() {
    await this.withRetry(async () => {
      const querySnapshot = await getDocs(collection(db, 'cartesia_keys'));
      querySnapshot.forEach((d) => {
        const data = d.data();
        const index = data.index;
        const isPaid = data.isPaid === true;
        const charCount = Number(data.charCountUsed) || 0;

        if (isPaid && this.paidKey) {
          this.paidKey.item.charCountUsed = charCount;
          if (data.lastUsedAt) this.paidKey.item.lastUsedAt = data.lastUsedAt;
        } else if (typeof index === 'number' && index >= 1 && index <= this.keys.length) {
          const k = this.keys[index - 1];
          if (k) {
            k.item.charCountUsed = charCount;
            if (data.lastUsedAt) k.item.lastUsedAt = data.lastUsedAt;
            if (charCount >= this.DEFAULT_LIMIT) k.item.status = 'exhausted';
          }
        }
      });
      console.log('[KeyRotator] Loaded usage stats from Firestore');
    }, 'loadUsageFromFirestore');
  }

  /**
   * Persist specific key usage to Firestore
   */
  private async saveKeyUsageToFirestore(index: number | 'paid') {
    const isPaid = index === 'paid';
    const keyObj = isPaid ? this.paidKey : this.keys[Number(index) - 1];
    if (!keyObj) return;

    const docId = isPaid ? 'key_paid' : `key_${index}`;
    
    await this.withRetry(async () => {
      await setDoc(doc(db, 'cartesia_keys', docId), {
        id: keyObj.item.id,
        index: isPaid ? 0 : index,
        label: keyObj.item.label,
        isPaid,
        charCountUsed: keyObj.item.charCountUsed,
        maxCharsLimit: keyObj.item.maxCharsLimit,
        lastUsedAt: keyObj.item.lastUsedAt,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    }, `saveKeyUsageToFirestore(${index})`);
  }

  /**
   * Discovers all CARTESIA_PAID_API_KEY, CARTESIA_API_KEY_1..N, CARTESIA_API_KEYS, and CARTESIA_API_KEY from process.env
   */
  public reloadEnvironmentKeys(clientCustomKeys: string[] = [], customPaidKey?: string) {
    // 0. Detect Dedicated Cartesia Paid Key (CARTESIA_PAID_API_KEY / CARTESIA_PAID_API)
    // NOTE: This key is STRICTLY EXCLUDED from the rotating pool. It never rotates and is reserved for Paid Model V4 and voice cloning.
    const paidEnvKey =
      (customPaidKey && customPaidKey.trim().length > 10 ? customPaidKey.trim() : null) ||
      process.env.CARTESIA_PAID_API_KEY?.trim() ||
      process.env.CARTESIA_PAID_API?.trim() ||
      process.env.CARTESIA_PAID_KEY?.trim() ||
      process.env.PAID_CARTESIA_API_KEY?.trim() ||
      null;

    const paidAccountEmail =
      this.accountDetailsMap.get('paid')?.email ||
      process.env.CARTESIA_PAID_ACCOUNT_EMAIL?.trim() ||
      process.env.CARTESIA_PAID_EMAIL?.trim() ||
      process.env.CARTESIA_PAID_ACCOUNT?.trim() ||
      'cartesia.paid@account.com';

    if (paidEnvKey && paidEnvKey.length > 10) {
      const existingAdmin = this.adminKeysMap.get(0)?.rawKey || this.adminKeysMap.get('paid')?.rawKey;
      const envAdminKey =
        process.env.CARTESIA_PAID_ADMIN_API_KEY?.trim() ||
        process.env.CARTESIA_PAID_ADMIN_KEY?.trim() ||
        process.env.CARTESIA_ADMIN_KEY_PAID?.trim() ||
        process.env.CARTESIA_ADMIN_API_KEY?.trim() ||
        process.env.CARTESIA_ADMIN_KEY?.trim() ||
        (paidEnvKey.startsWith('sk_car_admin_') ? paidEnvKey : null);

      const effectiveAdmin = existingAdmin || envAdminKey;
      if (effectiveAdmin) {
        this.adminKeysMap.set(0, { rawKey: effectiveAdmin, cachedCredits: this.adminKeysMap.get(0)?.cachedCredits || this.paidKey?.item.cachedCredits });
        this.adminKeysMap.set('paid', { rawKey: effectiveAdmin, cachedCredits: this.adminKeysMap.get('paid')?.cachedCredits || this.paidKey?.item.cachedCredits });
      }

      this.paidKey = {
        rawKey: paidEnvKey,
        item: {
          id: 'cartesia_paid_key',
          index: 0,
          label: '💎 Cartesia Paid API (Dedicated - Voice Clone & V4)',
          maskedKey: this.maskKey(paidEnvKey),
          source: 'env',
          charCountUsed: this.paidKey?.item.charCountUsed || 0,
          maxCharsLimit: 1000000, // Unlimited / High Pro capacity
          status: 'active',
          lastUsedAt: this.paidKey?.item.lastUsedAt || null,
          accountEmail: paidAccountEmail,
          accountDetails: this.accountDetailsMap.get('paid')?.details || 'Model V4 Dedicated Paid Account',
          customVoicesCount: this.paidKey?.item.customVoicesCount ?? 0,
          adminKeyMasked: effectiveAdmin ? this.maskKey(effectiveAdmin) : this.paidKey?.item.adminKeyMasked,
          cachedCredits: this.paidKey?.item.cachedCredits || this.adminKeysMap.get(0)?.cachedCredits,
        },
      };
    }

    const rawFound: { key: string; label: string; source: 'env' | 'custom' }[] = [];

    // 1. Check primary Cartesia API 1: CARTESIA_API_1, CARTESIA_API_KEY_1, or CARTESIA_API_KEY
    // These keys ROTATE when quota is exhausted
    const primaryKey =
      process.env.CARTESIA_API_1?.trim() ||
      process.env.CARTESIA_API_KEY_1?.trim() ||
      process.env.CARTESIA_API_KEY?.trim();
    if (primaryKey && primaryKey.length > 10) {
      rawFound.push({
        key: primaryKey,
        label: `Cartesia API 1 (Account #1)`,
        source: 'env',
      });
    }

    // 2. Check indexed Cartesia API 2..20: CARTESIA_API_2..N, CARTESIA_API_KEY_2..N
    // These keys ROTATE automatically
    for (let i = 2; i <= 20; i++) {
      const val = process.env[`CARTESIA_API_${i}`] || process.env[`CARTESIA_API_KEY_${i}`];
      if (val && val.trim().length > 10 && !rawFound.some((r) => r.key === val.trim())) {
        rawFound.push({
          key: val.trim(),
          label: `Cartesia API ${i} (Account #${i})`,
          source: 'env',
        });
      }
    }

    // 4. Check comma-separated CARTESIA_API_KEYS
    if (process.env.CARTESIA_API_KEYS) {
      const split = process.env.CARTESIA_API_KEYS.split(',');
      split.forEach((k, idx) => {
        const clean = k.trim();
        if (clean.length > 10 && !rawFound.some((r) => r.key === clean)) {
          rawFound.push({
            key: clean,
            label: `Key #CSV-${idx + 1} (CARTESIA_API_KEYS)`,
            source: 'env',
          });
        }
      });
    }

    // 4. Client-provided custom keys
    clientCustomKeys.forEach((k, idx) => {
      const clean = k.trim();
      if (clean.length > 10 && !rawFound.some((r) => r.key === clean)) {
        rawFound.push({
          key: clean,
          label: `Custom Key #${idx + 1}`,
          source: 'custom',
        });
      }
    });

    // Merge with existing state so we don't lose character count counters
    const newKeysList: { rawKey: string; item: KeyPoolItem }[] = [];

    rawFound.forEach((entry, idx) => {
      const existing = this.keys.find((k) => k.rawKey === entry.key);
      const masked = this.maskKey(entry.key);
      const keyIndex = idx + 1;
      const accountEmail =
        this.accountDetailsMap.get(String(keyIndex))?.email ||
        existing?.item.accountEmail ||
        process.env[`CARTESIA_ACCOUNT_EMAIL_${keyIndex}`]?.trim() ||
        process.env[`CARTESIA_EMAIL_${keyIndex}`]?.trim() ||
        process.env[`CARTESIA_ACCOUNT_${keyIndex}`]?.trim() ||
        `cartesia.acc${keyIndex}@account.com`;
      const accountDetails =
        this.accountDetailsMap.get(String(keyIndex))?.details ||
        existing?.item.accountDetails ||
        `Cartesia Account for Key #${keyIndex}`;

      const adminKeyEntry = this.adminKeysMap.get(keyIndex);
      const envAdminKey = process.env[`CARTESIA_ADMIN_API_KEY_${keyIndex}`] || process.env[`CARTESIA_ADMIN_KEY_${keyIndex}`];
      const adminMasked = adminKeyEntry?.rawKey
        ? this.maskKey(adminKeyEntry.rawKey)
        : envAdminKey
        ? this.maskKey(envAdminKey)
        : existing?.item.adminKeyMasked;
      const cachedCredits = adminKeyEntry?.cachedCredits || existing?.item.cachedCredits;

      const knownVoices = this.keyVoicesMap.get(keyIndex) || [];
      const customCount = knownVoices.length > 0 ? knownVoices.length : (existing?.item.customVoicesCount ?? 0);

      if (existing) {
        newKeysList.push({
          rawKey: entry.key,
          item: {
            ...existing.item,
            index: keyIndex,
            label: entry.label,
            maskedKey: masked,
            accountEmail,
            accountDetails,
            customVoicesCount: customCount,
            adminKeyMasked: adminMasked,
            cachedCredits: cachedCredits,
          },
        });
      } else {
        newKeysList.push({
          rawKey: entry.key,
          item: {
            id: `key_${keyIndex}_${Date.now()}`,
            index: keyIndex,
            label: entry.label,
            maskedKey: masked,
            source: entry.source,
            charCountUsed: 0,
            maxCharsLimit: this.DEFAULT_LIMIT,
            status: idx === 0 ? 'active' : 'standby',
            lastUsedAt: null,
            accountEmail,
            accountDetails,
            customVoicesCount: customCount,
            adminKeyMasked: adminMasked,
            cachedCredits: cachedCredits,
          },
        });
      }
    });

    this.keys = newKeysList;

    // Ensure valid active index
    if (this.activeKeyIndex >= this.keys.length) {
      this.activeKeyIndex = 0;
    }

    this.syncActiveKeyStatus();
  }

  private maskKey(key: string): string {
    if (!key || key.length < 10) return 'sk_car_***';
    return `${key.substring(0, 7)}...${key.substring(key.length - 4)}`;
  }

  private syncActiveKeyStatus() {
    this.keys.forEach((k, idx) => {
      if (k.item.status !== 'exhausted' && k.item.status !== 'rate_limited' && k.item.status !== 'error') {
        k.item.status = idx === this.activeKeyIndex ? 'active' : 'standby';
      }
    });
  }

  /**
   * Get the best available API key from the pool
   */
  public getActiveKey(): { rawKey: string; index: number; poolSize: number } | null {
    if (this.keys.length === 0) {
      this.reloadEnvironmentKeys();
    }
    if (this.keys.length === 0) {
      return null;
    }

    // Ensure current active key is healthy and has custom voices if possible
    const currentVoices = this.keyVoicesMap.get(this.activeKeyIndex + 1) || [];
    if (currentVoices.length === 0) {
      for (let i = 0; i < this.keys.length; i++) {
        const idx = (this.activeKeyIndex + 1 + i) % this.keys.length;
        const candidate = this.keys[idx];
        const cVoices = this.keyVoicesMap.get(idx + 1) || [];
        if (
          cVoices.length > 0 &&
          candidate.item.status !== 'exhausted' &&
          candidate.item.status !== 'rate_limited' &&
          candidate.item.charCountUsed < candidate.item.maxCharsLimit - 100
        ) {
          this.activeKeyIndex = idx;
          this.syncActiveKeyStatus();
          console.log(`[KeyRotator] getActiveKey switched to Key #${idx + 1} because it has ${cVoices.length} custom voices.`);
          break;
        }
      }
    }

    const current = this.keys[this.activeKeyIndex];
    if (
      current &&
      current.item.status !== 'exhausted' &&
      current.item.status !== 'rate_limited' &&
      current.item.charCountUsed < current.item.maxCharsLimit - 100
    ) {
      return {
        rawKey: current.rawKey,
        index: this.activeKeyIndex + 1,
        poolSize: this.keys.length,
      };
    }

    // Search for next available healthy key
    for (let i = 0; i < this.keys.length; i++) {
      const idx = (this.activeKeyIndex + 1 + i) % this.keys.length;
      const candidate = this.keys[idx];
      if (
        candidate.item.status !== 'exhausted' &&
        candidate.item.status !== 'rate_limited' &&
        candidate.item.charCountUsed < candidate.item.maxCharsLimit - 100
      ) {
        this.activeKeyIndex = idx;
        this.syncActiveKeyStatus();
        console.log(`[KeyRotator] Switched active key to Index #${idx + 1} (${candidate.item.label})`);
        return {
          rawKey: candidate.rawKey,
          index: idx + 1,
          poolSize: this.keys.length,
        };
      }
    }

    // If all are exhausted or nearing limit, fall back to current active key anyway
    return {
      rawKey: this.keys[this.activeKeyIndex].rawKey,
      index: this.activeKeyIndex + 1,
      poolSize: this.keys.length,
    };
  }

  /**
   * Get specific key info by 1-based index or the currently active key
   */
  public getKeyByIndex(index?: number | string): { rawKey: string; index: number; label: string; item: KeyPoolItem } | null {
    if (index === 0 || index === 'paid' || index === '0') {
      const pk = this.getPaidKey();
      if (pk) {
        return {
          rawKey: pk.rawKey,
          index: 0,
          label: pk.item.label,
          item: { ...pk.item },
        };
      }
    }

    if (this.keys.length === 0) {
      this.reloadEnvironmentKeys();
    }
    if (this.keys.length === 0) return null;

    const targetIdx =
      typeof index === 'number' && index >= 1 && index <= this.keys.length
        ? index - 1
        : this.activeKeyIndex;

    const k = this.keys[targetIdx] || this.keys[0];
    return {
      rawKey: k.rawKey,
      index: targetIdx + 1,
      label: k.item.label,
      item: { ...k.item },
    };
  }

  /**
   * Record character usage after successful synthesis and auto-rotate when reaching 19,500 chars
   */
  public recordUsage(usedChars: number, isPaid: boolean = false): { rotated: boolean; prevIndex?: number; newIndex?: number; currentChars: number } {
    if (isPaid && this.paidKey) {
      this.paidKey.item.charCountUsed += usedChars;
      this.paidKey.item.lastUsedAt = new Date().toISOString();
      this.saveKeyUsageToFirestore('paid');
      return { rotated: false, currentChars: this.paidKey.item.charCountUsed };
    }

    if (this.keys.length === 0) return { rotated: false, currentChars: 0 };
    const current = this.keys[this.activeKeyIndex];
    if (!current) return { rotated: false, currentChars: 0 };

    current.item.charCountUsed += usedChars;
    current.item.lastUsedAt = new Date().toISOString();
    
    // Persist to Firestore
    this.saveKeyUsageToFirestore(this.activeKeyIndex + 1);

    const ROTATION_THRESHOLD = 19500;
    // When characters reach 19,500 (approaching 20,000 free quota), auto-advance to next healthy key
    if (current.item.charCountUsed >= ROTATION_THRESHOLD) {
      console.warn(
        `[KeyRotator] Key #${this.activeKeyIndex + 1} reached ${current.item.charCountUsed} characters (limit: ${ROTATION_THRESHOLD})! Auto-advancing to next key...`
      );
      current.item.status = 'exhausted';
      const prevIdx = this.activeKeyIndex + 1;
      const next = this.advanceToNextHealthyKey();
      return {
        rotated: true,
        prevIndex: prevIdx,
        newIndex: next?.index || this.activeKeyIndex + 1,
        currentChars: current.item.charCountUsed,
      };
    }

    return {
      rotated: false,
      currentChars: current.item.charCountUsed,
    };
  }

  /**
   * Mark current key as failed due to rate limit (429) or quota exceeded (402)
   * and immediately rotate to next available key
   */
  public markFailureAndRotate(status: number, errorMsg: string): { nextKey: string; index: number } | null {
    if (this.keys.length === 0) return null;

    const current = this.keys[this.activeKeyIndex];
    if (current) {
      if (status === 402 || errorMsg.includes('subscription') || errorMsg.includes('free tier') || errorMsg.includes('quota')) {
        current.item.status = 'exhausted';
      } else if (status === 429) {
        current.item.status = 'rate_limited';
      } else {
        current.item.status = 'error';
      }
      current.item.errorMessage = errorMsg;
      console.warn(`[KeyRotator] Key #${this.activeKeyIndex + 1} flagged as ${current.item.status} (${status}): ${errorMsg}`);
    }

    return this.advanceToNextHealthyKey();
  }

  private advanceToNextHealthyKey(): { nextKey: string; index: number } | null {
    for (let i = 1; i <= this.keys.length; i++) {
      const nextIdx = (this.activeKeyIndex + i) % this.keys.length;
      const candidate = this.keys[nextIdx];
      if (candidate.item.status !== 'exhausted' && candidate.item.status !== 'rate_limited') {
        this.activeKeyIndex = nextIdx;
        this.syncActiveKeyStatus();
        console.log(`[KeyRotator] Successfully rotated to Key #${nextIdx + 1}: ${candidate.item.maskedKey}`);
        return {
          nextKey: candidate.rawKey,
          index: nextIdx + 1,
        };
      }
    }
    // If all are marked failed, cycle to next anyway to allow retry
    this.activeKeyIndex = (this.activeKeyIndex + 1) % this.keys.length;
    this.syncActiveKeyStatus();
    return {
      nextKey: this.keys[this.activeKeyIndex].rawKey,
      index: this.activeKeyIndex + 1,
    };
  }

  /**
   * Reset usage counter for a specific key or all keys (e.g. after monthly billing reset)
   */
  public async resetKeyUsage(index?: number | 'paid') {
    if (index === 'paid' && this.paidKey) {
      this.paidKey.item.charCountUsed = 0;
      this.saveKeyUsageToFirestore('paid');
    } else if (typeof index === 'number' && this.keys[index - 1]) {
      const k = this.keys[index - 1];
      k.item.charCountUsed = 0;
      k.item.status = (index - 1 === this.activeKeyIndex) ? 'active' : 'standby';
      delete k.item.errorMessage;
      this.saveKeyUsageToFirestore(index);
    } else {
      this.keys.forEach((k, idx) => {
        k.item.charCountUsed = 0;
        k.item.status = idx === this.activeKeyIndex ? 'active' : 'standby';
        delete k.item.errorMessage;
        this.saveKeyUsageToFirestore(idx + 1);
      });
      if (this.paidKey) {
        this.paidKey.item.charCountUsed = 0;
        this.saveKeyUsageToFirestore('paid');
      }
    }
  }

  /**
   * Switch active key manually
   */
  public switchActiveKey(index: number): boolean {
    if (index >= 1 && index <= this.keys.length) {
      this.activeKeyIndex = index - 1;
      this.syncActiveKeyStatus();
      return true;
    }
    return false;
  }

  /**
   * Get dedicated paid key if available
   */
  public getPaidKey(): { rawKey: string; item: KeyPoolItem } | null {
    if (!this.paidKey) {
      this.reloadEnvironmentKeys();
    }
    return this.paidKey;
  }

  /**
   * Set custom paid API key from client or UI settings
   */
  public setCustomPaidKey(key: string) {
    const clean = key ? key.trim() : '';
    if (clean.length > 10) {
      const paidAccountEmail =
        this.accountDetailsMap.get('paid')?.email ||
        process.env.CARTESIA_PAID_ACCOUNT_EMAIL?.trim() ||
        'cartesia.paid@account.com';
      this.paidKey = {
        rawKey: clean,
        item: {
          id: 'cartesia_paid_key',
          index: 0,
          label: '💎 Cartesia Paid API (Voice Clone Enabled)',
          maskedKey: this.maskKey(clean),
          source: 'custom',
          charCountUsed: 0,
          maxCharsLimit: 1000000,
          status: 'active',
          lastUsedAt: null,
          accountEmail: paidAccountEmail,
          accountDetails: this.accountDetailsMap.get('paid')?.details || 'Model V4 Dedicated Paid Account',
          customVoicesCount: 0,
        },
      };
    } else {
      this.paidKey = null;
    }
  }

  /**
   * Update Cartesia account details (Email & Notes) for a specific key
   */
  public updateKeyAccount(keyIdentifier: number | 'paid', email: string, details?: string) {
    const cleanEmail = email ? email.trim() : '';
    const cleanDetails = details ? details.trim() : '';
    const mapKey = String(keyIdentifier);

    this.accountDetailsMap.set(mapKey, { email: cleanEmail, details: cleanDetails });

    if (keyIdentifier === 'paid' || keyIdentifier === 0) {
      if (this.paidKey) {
        this.paidKey.item.accountEmail = cleanEmail;
        if (cleanDetails) this.paidKey.item.accountDetails = cleanDetails;
      }
    } else {
      const target = this.keys.find((k) => k.item.index === keyIdentifier);
      if (target) {
        target.item.accountEmail = cleanEmail;
        if (cleanDetails) target.item.accountDetails = cleanDetails;
      }
    }
  }

  /**
   * Set and cache Admin API Key (sk_car_admin_...) and live credit info for a key
   */
  public setAdminKey(keyIndex: number | 'paid' | string, adminKey: string, creditsData?: any) {
    const cleanAdminKey = adminKey ? adminKey.trim() : '';
    if (cleanAdminKey) {
      const isPaid = keyIndex === 'paid' || keyIndex === 0 || keyIndex === '0';
      const numIndex = isPaid ? 0 : Number(keyIndex);

      this.adminKeysMap.set(numIndex, { rawKey: cleanAdminKey, cachedCredits: creditsData });
      this.adminKeysMap.set(String(keyIndex), { rawKey: cleanAdminKey, cachedCredits: creditsData });

      if (isPaid && this.paidKey) {
        this.paidKey.item.adminKeyMasked = this.maskKey(cleanAdminKey);
        if (creditsData) this.paidKey.item.cachedCredits = creditsData;
      } else {
        const target = this.keys.find((k) => k.item.index === numIndex);
        if (target) {
          target.item.adminKeyMasked = this.maskKey(cleanAdminKey);
          if (creditsData) target.item.cachedCredits = creditsData;
        }
      }
    }
  }

  public getAdminKey(keyIndex: number | 'paid' | string): string | null {
    const isPaid = keyIndex === 'paid' || keyIndex === 0 || keyIndex === '0';
    if (isPaid) {
      const found = this.adminKeysMap.get(0) || this.adminKeysMap.get('paid');
      if (found?.rawKey) return found.rawKey;
      return (
        process.env.CARTESIA_PAID_ADMIN_API_KEY?.trim() ||
        process.env.CARTESIA_PAID_ADMIN_KEY?.trim() ||
        process.env.CARTESIA_ADMIN_KEY_PAID?.trim() ||
        process.env.CARTESIA_ADMIN_API_KEY?.trim() ||
        process.env.CARTESIA_ADMIN_KEY?.trim() ||
        null
      );
    }
    const num = Number(keyIndex);
    const found = this.adminKeysMap.get(num) || this.adminKeysMap.get(String(keyIndex));
    if (found?.rawKey) return found.rawKey;
    const envVal = process.env[`CARTESIA_ADMIN_API_KEY_${num}`] || process.env[`CARTESIA_ADMIN_KEY_${num}`];
    return envVal?.trim() || null;
  }

  /**
   * Update cached custom voices count for a key
   */
  public setKeyVoiceCount(keyIdentifier: number | 'paid', count: number) {
    if (keyIdentifier === 'paid' || keyIdentifier === 0) {
      if (this.paidKey) {
        this.paidKey.item.customVoicesCount = Math.max(0, count);
      }
    } else {
      const target = this.keys.find((k) => k.item.index === keyIdentifier);
      if (target) {
        target.item.customVoicesCount = Math.max(0, count);
      }
    }
  }

  /**
   * Refresh custom voices count and character lists for all active keys in parallel
   */
  public async refreshVoiceCounts(): Promise<Record<string, number>> {
    const results: Record<string, number> = {};

    const fetchTasks: Promise<void>[] = [];

    // 1. Fetch pool keys in parallel
    for (const keyObj of this.keys) {
      fetchTasks.push((async () => {
        try {
          const res = await fetch('https://api.cartesia.ai/voices', {
            headers: {
              'X-API-Key': keyObj.rawKey,
              'Cartesia-Version': '2024-06-10',
            },
          });
          if (res.ok) {
            const list: any[] = await res.json();
            const customVoices = list
              .filter((v) => v && v.id && (v.is_public === false || (v.owner_id && v.owner_id !== 'org_3AOx6OD02K1e7Z1Pb43IpkjuszN')))
              .map((v) => ({
                id: v.id,
                name: v.name || 'Cloned Voice',
                description: v.description || `Cartesia Character for Key #${keyObj.item.index}`,
                speed: '1.0x',
                emotion: 'neutral',
                createdAt: v.created_at || 'Custom',
                isCloned: true,
                keyIndex: keyObj.item.index,
              }));
            this.keyVoicesMap.set(keyObj.item.index, customVoices);
            keyObj.item.customVoicesCount = customVoices.length;
            results[String(keyObj.item.index)] = customVoices.length;
          }
        } catch (err) {
          console.warn(`[KeyRotator] Voice count check error for Key #${keyObj.item.index}:`, err);
        }
      })());
    }

    // 2. Fetch Paid Key in parallel
    if (this.paidKey) {
      fetchTasks.push((async () => {
        try {
          const res = await fetch('https://api.cartesia.ai/voices', {
            headers: {
              'X-API-Key': this.paidKey!.rawKey,
              'Cartesia-Version': '2024-06-10',
            },
          });
          if (res.ok) {
            const list: any[] = await res.json();
            const customVoices = list
              .filter((v) => v && v.id && (v.is_public === false || (v.owner_id && v.owner_id !== 'org_3AOx6OD02K1e7Z1Pb43IpkjuszN')))
              .map((v) => ({
                id: v.id,
                name: `💎 ${v.name || 'Cloned Voice'}`,
                description: v.description || 'Cartesia V4 Paid Cloned Character',
                speed: '1.0x',
                emotion: 'neutral',
                createdAt: v.created_at || 'Paid Cloned',
                isCloned: true,
                isPaidCloned: true,
                isV4: true,
              }));
            this.keyVoicesMap.set('paid', customVoices);
            this.paidKey!.item.customVoicesCount = customVoices.length;
            results['paid'] = customVoices.length;
          }
        } catch (pErr) {
          console.warn('[KeyRotator] Voice count check error for Paid Key:', pErr);
        }
      })());
    }

    await Promise.allSettled(fetchTasks);

    // Auto-select first key with custom voices if active key has 0 voices
    const activeVoices = this.keyVoicesMap.get(this.activeKeyIndex + 1) || [];
    if (activeVoices.length === 0) {
      for (const k of this.keys) {
        const vList = this.keyVoicesMap.get(k.item.index) || [];
        if (vList.length > 0) {
          this.activeKeyIndex = k.item.index - 1;
          this.syncActiveKeyStatus();
          console.log(`[KeyRotator] Auto-selected Key #${k.item.index} as active key (${vList.length} custom voices found).`);
          break;
        }
      }
    }

    return results;
  }

  /**
   * Get cloned voices for a specific key index
   */
  public getVoicesForKey(index: number | 'paid'): any[] {
    return this.keyVoicesMap.get(index) || [];
  }

  /**
   * Get all custom cloned voices across all keys
   */
  public getAllCustomVoices(): any[] {
    const all: any[] = [];
    for (const voices of this.keyVoicesMap.values()) {
      all.push(...voices);
    }
    return all;
  }

  public getKeys() {
    return this.keys;
  }

  /**
   * Locate the exact key that owns a given voiceId
   */
  public getKeyForVoiceId(voiceId: string): { rawKey: string; keyIndex: number; voice: any } | null {
    if (!voiceId) return null;
    for (const [kIdx, voices] of this.keyVoicesMap.entries()) {
      const foundVoice = voices.find((v) => v.id === voiceId);
      if (foundVoice) {
        if (kIdx === 'paid' && this.paidKey) {
          return { rawKey: this.paidKey.rawKey, keyIndex: 0, voice: foundVoice };
        }
        if (typeof kIdx === 'number' && this.keys[kIdx - 1]) {
          return { rawKey: this.keys[kIdx - 1].rawKey, keyIndex: kIdx, voice: foundVoice };
        }
      }
    }
    return null;
  }

  /**
   * Locate the exact key that owns a given voiceId, doing a live API check if not in cache
   */
  public async findKeyForVoiceIdLive(voiceId: string, isV4Only: boolean = false): Promise<{ rawKey: string; keyIndex: number | 'paid'; voice?: any } | null> {
    if (!voiceId) return null;

    // 1. Check in-memory cached map first
    const cached = this.getKeyForVoiceId(voiceId);
    if (cached) {
      const isPaidKey = cached.keyIndex === 0;
      if (isV4Only && isPaidKey) {
        return { rawKey: cached.rawKey, keyIndex: cached.keyIndex, voice: cached.voice };
      }
      if (!isV4Only && !isPaidKey) {
        return { rawKey: cached.rawKey, keyIndex: cached.keyIndex, voice: cached.voice };
      }
    }

    // 2. Perform live check strictly across applicable keys
    const keysToCheck: { keyIndex: number | 'paid'; rawKey: string }[] = [];

    if (isV4Only) {
      if (this.paidKey?.rawKey) {
        keysToCheck.push({ keyIndex: 'paid', rawKey: this.paidKey.rawKey });
      }
    } else {
      for (const k of this.keys) {
        if (k.rawKey) {
          keysToCheck.push({ keyIndex: k.item.index, rawKey: k.rawKey });
        }
      }
    }

    for (const kItem of keysToCheck) {
      try {
        const res = await fetch(`https://api.cartesia.ai/voices/${voiceId}`, {
          headers: {
            'X-API-Key': kItem.rawKey,
            'Cartesia-Version': '2024-06-10',
          },
        });
        if (res.ok) {
          const vData: any = await res.json();
          const voiceObj = {
            id: vData.id,
            name: vData.name || 'Cloned Voice',
            description: vData.description || 'Cartesia Character',
            speed: '1.0x',
            emotion: 'neutral',
            createdAt: vData.created_at || 'Custom',
            isCloned: true,
            isV4: kItem.keyIndex === 'paid',
          };

          // Register in keyVoicesMap
          const mapKey = kItem.keyIndex === 'paid' ? 'paid' : (kItem.keyIndex as number);
          const existing = this.keyVoicesMap.get(mapKey) || [];
          if (!existing.some((v) => v.id === vData.id)) {
            existing.push(voiceObj);
            this.keyVoicesMap.set(mapKey, existing);
          }

          if (typeof kItem.keyIndex === 'number') {
            this.switchActiveKey(kItem.keyIndex);
          }

          return { rawKey: kItem.rawKey, keyIndex: kItem.keyIndex, voice: voiceObj };
        }
      } catch (err) {
        // Ignore single key lookup error
      }
    }

    return null;
  }

  /**
   * Returns public status payload safe for client-side display
   */
  public getStatusPayload() {
    const totalCharsUsed = this.keys.reduce((acc, k) => acc + k.item.charCountUsed, 0);
    const totalCapacity = this.keys.length * this.DEFAULT_LIMIT;
    const remainingChars = Math.max(0, totalCapacity - totalCharsUsed);

    return {
      totalKeys: this.keys.length,
      activeKeyIndex: this.activeKeyIndex + 1,
      totalCharsUsed,
      totalCapacity,
      remainingChars,
      hasPaidKey: Boolean(this.paidKey),
      paidKey: this.paidKey ? { ...this.paidKey.item } : null,
      keys: this.keys.map((k) => ({
        ...k.item,
        customVoicesCount: this.keyVoicesMap.get(k.item.index)?.length || k.item.customVoicesCount || 0,
      })),
    };
  }
}

export const cartesiaRotator = new CartesiaKeyRotator();
