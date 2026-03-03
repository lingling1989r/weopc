import { UserLevel } from '@prisma/client';
import { prisma } from '../../database/prisma/client';

const LEVEL_ORDER: UserLevel[] = ['NORMAL', 'OFFICIAL', 'GOLD', 'KING'];

export function calculatePoints(rating: number): number {
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
  let targetLevel: UserLevel = currentLevel;

  if (points >= 500 && avgRating >= 4.5 && reviewCount >= 10) {
    targetLevel = 'KING';
  } else if (points >= 200 && avgRating >= 4.0) {
    targetLevel = 'GOLD';
  }

  // Only upgrade, never downgrade automatically
  const currentIndex = LEVEL_ORDER.indexOf(currentLevel);
  const targetIndex = LEVEL_ORDER.indexOf(targetLevel);
  return targetIndex > currentIndex ? targetLevel : currentLevel;
}

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
