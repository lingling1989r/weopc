import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const REVENUE_TIER_LABELS: Record<string, string> = {
  TIER_0_1K: '0-1千',
  TIER_1K_5K: '1千-5千',
  TIER_5K_10K: '5千-1万',
  TIER_10K_30K: '1万-3万',
  TIER_30K_50K: '3万-5万',
  TIER_50K_100K: '5万-10万',
  TIER_100K_PLUS: '10万+',
};

export const PROJECT_TYPE_LABELS: Record<string, string> = {
  FULL_TIME: '全职',
  PART_TIME: '兼职',
  FREELANCE: '自由职业',
  SIDE_GIG: '副业',
  INTERNSHIP: '实习',
  TOOLBOX: '工具箱',
};

export const EXECUTION_REQ_LABELS: Record<string, string> = {
  REMOTE: '远程',
  ONSITE: '现场',
  HYBRID: '混合',
  FLEXIBLE: '灵活',
};

export const LEAD_STATUS_LABELS: Record<string, string> = {
  PENDING: '待处理',
  CONTACTED: '已联系',
  IN_PROGRESS: '进行中',
  ACCEPTED: '已接受',
  REJECTED: '已拒绝',
  COMPLETED: '已完成',
  CANCELLED: '已取消',
};
