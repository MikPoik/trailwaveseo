/**
 * Quota Manager Module
 * Handles user quotas, credits, and access limitations
 */

import { storage } from '../storage.js';

export interface QuotaInfo {
  settings: any;
  userUsage?: any;
  isTrialUser: boolean;
  aiSuggestionsRemaining: number;
  remainingQuota: number;
  effectiveMaxPages: number;
}

export interface CreditResult {
  success: boolean;
  remainingCredits: number;
  creditsCost: number;
}

/**
 * Initialize user quotas and access limitations
 */
export async function initializeQuotas(
  userId: string | undefined,
  options: any
): Promise<QuotaInfo> {
  
  // Get settings for this user
  const settings = await storage.getSettings(userId);
  
  // Initialize default values
  let remainingQuota = settings.maxPages;
  let userUsage = null;
  let isTrialUser = false;
  let aiSuggestionsRemaining = 0;

  if (userId) {
    userUsage = await storage.getUserUsage(userId);
    if (userUsage) {
      // Check if user is on trial account
      isTrialUser = userUsage.accountStatus === "trial";

      // Calculate AI suggestions and page limits based on account status
      if (isTrialUser) {
        // Trial users: limit to 3 pages max, each page gets AI suggestions
        aiSuggestionsRemaining = Math.min(3, userUsage.credits);
        remainingQuota = Math.min(3, settings.maxPages);
        console.log(`Trial user ${userId}: limited to 3 pages per scan, ${aiSuggestionsRemaining} AI suggestions available`);
      } else {
        // Paid users: unlimited pages (up to settings), 1 credit per page for AI suggestions
        aiSuggestionsRemaining = userUsage.credits;

        if (userUsage.pageLimit === -1) {
          // Unlimited access - use settings.maxPages as the technical limit
          remainingQuota = settings.maxPages;
          console.log(`Paid user ${userId} has unlimited access (${userUsage.pagesAnalyzed} pages analyzed so far)`);
        } else {
          remainingQuota = Math.max(0, userUsage.pageLimit - userUsage.pagesAnalyzed);
          console.log(`Paid user ${userId} has ${remainingQuota} pages remaining (${userUsage.pagesAnalyzed}/${userUsage.pageLimit})`);

          // If user has no remaining quota, stop immediately
          if (remainingQuota <= 0) {
            throw new Error(`Page analysis limit reached. You have analyzed ${userUsage.pagesAnalyzed}/${userUsage.pageLimit} pages.`);
          }
        }
      }

      console.log(`User ${userId} AI suggestions: ${aiSuggestionsRemaining} available (trial: ${isTrialUser})`);
    }
  }

  // Set effective max pages based on user type
  let effectiveMaxPages = Math.min(settings.maxPages, remainingQuota);

  // For trial users, ensure we don't analyze more pages than we can provide AI suggestions for
  if (isTrialUser && settings.useAI && aiSuggestionsRemaining > 0) {
    effectiveMaxPages = Math.min(effectiveMaxPages, 3);
    console.log(`Trial user: limiting analysis to 3 pages maximum`);
  }

  return {
    settings,
    userUsage,
    isTrialUser,
    aiSuggestionsRemaining,
    remainingQuota,
    effectiveMaxPages
  };
}

/**
 * Check if user can analyze more pages during processing
 */
export async function checkQuotaLimits(
  userId: string | undefined,
  currentPagesAnalyzed: number,
  remainingQuota: number,
  settings: any
): Promise<boolean> {
  
  if (!userId) return true;

  const usage = await storage.getUserUsage(userId);
  if (!usage) return false;

  // Check quota limits
  if (usage.pageLimit !== -1 && currentPagesAnalyzed >= remainingQuota) {
    console.log(`Stopping analysis - reached page quota limit of ${remainingQuota} pages`);
    return false;
  }

  // For unlimited users, only stop if we hit the technical limit
  if (usage.pageLimit === -1 && currentPagesAnalyzed >= settings.maxPages) {
    console.log(`Stopping analysis - reached technical limit of ${settings.maxPages} pages`);
    return false;
  }

  return true;
}

/**
 * Handle credit deduction for AI suggestions
 */
export async function deductAICredits(
  userId: string | undefined,
  isTrialUser: boolean,
  costPerPage: number = 1
): Promise<CreditResult> {
  
  if (!userId) {
    return { success: false, remainingCredits: 0, creditsCost: 0 };
  }

  if (isTrialUser) {
    // Trial users don't deduct credits per page, they're pre-allocated
    return { success: true, remainingCredits: 0, creditsCost: 0 };
  }

  // For paid users, atomically check and deduct credits per page for AI suggestions
  const creditResult = await storage.atomicDeductCredits(userId, costPerPage);
  
  if (!creditResult.success) {
    console.log(`Insufficient credits for AI suggestions, skipping`);
  }

  return {
    success: creditResult.success,
    remainingCredits: creditResult.remainingCredits,
    creditsCost: costPerPage
  };
}

/**
 * Handle credit deduction for chat messages (1 credit per 5 messages)
 */
export async function deductChatCredits(
  userId: string | undefined,
  isTrialUser: boolean
): Promise<CreditResult> {
  
  if (!userId) {
    return { success: false, remainingCredits: 0, creditsCost: 0 };
  }

  // Check if user has sufficient credits first
  const userUsage = await storage.getUserUsage(userId);
  if (!userUsage || userUsage.credits <= 0) {
    return { success: false, remainingCredits: 0, creditsCost: 1 };
  }

  // Increment the chat message counter
  const result = await storage.incrementChatMessageInPack(userId);
  
  if (result.shouldDeductCredit) {
    // A credit was deducted (5th message)
    const remainingCredits = result.user?.credits || 0;
    console.log(`Chat message pack completed for user ${userId}, 1 credit deducted, ${remainingCredits} remaining`);
    
    return {
      success: true,
      remainingCredits,
      creditsCost: 1
    };
  } else {
    // No credit deducted yet, still counting messages
    const remainingCredits = result.user?.credits || userUsage.credits;
    const messagesInPack = result.user?.chatMessagesInPack || 0;
    console.log(`Chat message ${messagesInPack}/5 for user ${userId}, ${remainingCredits} credits remaining`);
    
    return {
      success: true,
      remainingCredits,
      creditsCost: 0
    };
  }
}

/**
 * Increment user page usage after successful analysis
 */
export async function incrementUserUsage(
  userId: string | undefined,
  pagesAnalyzed: number
): Promise<void> {
  
  if (userId && pagesAnalyzed > 0) {
    console.log(`Incrementing user usage by ${pagesAnalyzed} pages for user ${userId}`);
    await storage.incrementUserUsage(userId, pagesAnalyzed);
  }
}