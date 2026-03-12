import { PointsActionType, UserLevel } from '@prisma/client';
import { prisma } from '../../database/prisma/client';

// Points configuration
const POINTS_CONFIG: Record<string, number> = {
  SIGNUP_BONUS: 20,
  INVITE_INVITER: 30,
  INVITE_INVITEE: 10,
  SKILL_SUBMIT: 10,
  SKILL_APPROVED: 40,
  INVITER_DAILY_CAP: 300,
};

type PointsAction = keyof typeof POINTS_CONFIG;

/**
 * Award points to a user with idempotency check
 */
export async function awardPoints(
  userId: string,
  actionType: PointsActionType,
  description: string,
  relatedId?: string,
  refType?: string
): Promise<{ success: boolean; pointsAwarded: number }> {
  // Check for idempotency - skip if this exact action already recorded
  if (relatedId && refType) {
    const existing = await prisma.userPoints.findFirst({
      where: {
        userId,
        actionType,
        relatedId,
        refType,
      },
    });
    if (existing) {
      return { success: false, pointsAwarded: 0 };
    }
  }

  // Get action points value
  const actionKey = actionType as PointsAction;
  const points = POINTS_CONFIG[actionKey] || 0;
  
  if (points === 0) {
    // For actions not in config (like ADMIN_DEDUCT with variable points), just create the record
    return { success: false, pointsAwarded: 0 };
  }

  // Use transaction to ensure atomicity
  await prisma.$transaction([
    prisma.userPoints.create({
      data: {
        userId,
        actionType,
        points,
        description,
        relatedId,
        refType,
      },
    }),
    prisma.user.update({
      where: { id: userId },
      data: {
        points: {
          increment: points,
        },
      },
    }),
  ]);

  return { success: true, pointsAwarded: points };
}

/**
 * Deduct points from a user (for purchases, penalties, etc.)
 */
export async function deductPoints(
  userId: string,
  points: number,
  description: string,
  relatedId?: string,
  refType?: string
): Promise<{ success: boolean; pointsDeducted: number }> {
  if (points <= 0) {
    return { success: false, pointsDeducted: 0 };
  }

  // Check user has enough points
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { points: true },
  });

  if (!user || user.points < points) {
    throw new Error('Insufficient points');
  }

  // Deduct points
  await prisma.$transaction([
    prisma.userPoints.create({
      data: {
        userId,
        actionType: 'ADMIN_DEDUCT',
        points: -points, // Negative for deduction
        description,
        relatedId,
        refType,
      },
    }),
    prisma.user.update({
      where: { id: userId },
      data: {
        points: {
          decrement: points,
        },
      },
    }),
  ]);

  return { success: true, pointsDeducted: points };
}

/**
 * Check if inviter has hit daily cap for invite points
 */
export async function checkInviterDailyCap(inviterUserId: string): Promise<boolean> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayPoints = await prisma.userPoints.aggregate({
    where: {
      userId: inviterUserId,
      actionType: 'INVITE_INVITER',
      createdAt: {
        gte: today,
      },
    },
    _sum: {
      points: true,
    },
  });

  const totalToday = todayPoints._sum.points || 0;
  return totalToday >= POINTS_CONFIG.INVITER_DAILY_CAP;
}

/**
 * Process points for received review (existing functionality)
 */
export async function processReviewPoints(
  targetUserId: string,
  rating: number,
  reviewId: string
): Promise<void> {
  const points = calculatePoints(rating);

  const user = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { points: true, avgRating: true, reviewCount: true, level: true },
  });

  if (!user) return;

  const newReviewCount = user.reviewCount + 1;
  const newAvgRating = (user.avgRating * user.reviewCount + rating) / newReviewCount;
  const newPoints = user.points + points;
  const newLevel = determineLevel(newPoints, newAvgRating, newReviewCount, user.level);

  await prisma.$transaction([
    prisma.userPoints.create({
      data: {
        userId: targetUserId,
        actionType: 'REVIEW_RECEIVED',
        points,
        description: `Received ${rating}-star review`,
        relatedId: reviewId,
        refType: 'review_received',
      },
    }),
    prisma.user.update({
      where: { id: targetUserId },
      data: {
        points: newPoints,
        avgRating: newAvgRating,
        reviewCount: newReviewCount,
        level: newLevel,
      },
    }),
  ]);
}

function calculatePoints(rating: number): number {
  switch (rating) {
    case 5: return 20;
    case 4: return 15;
    case 3: return 10;
    case 2: return 5;
    case 1: return 2;
    default: return 0;
  }
}

function determineLevel(
  points: number,
  avgRating: number,
  reviewCount: number,
  currentLevel: UserLevel
): UserLevel {
  const LEVEL_ORDER: UserLevel[] = ['NORMAL', 'OFFICIAL', 'GOLD', 'KING'];
  let targetLevel: UserLevel = currentLevel;

  if (points >= 500 && avgRating >= 4.5 && reviewCount >= 10) {
    targetLevel = 'KING';
  } else if (points >= 200 && avgRating >= 4.0) {
    targetLevel = 'GOLD';
  }

  const currentIndex = LEVEL_ORDER.indexOf(currentLevel);
  const targetIndex = LEVEL_ORDER.indexOf(targetLevel);
  return targetIndex > currentIndex ? targetLevel : currentLevel;
}

export { POINTS_CONFIG };
