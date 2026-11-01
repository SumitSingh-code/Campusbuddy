// ─── Golden Badge Recipients & Verification Helper ────────────────
// 25 Early Bird Pioneer students of UniGram (CRSU) registered on Haryana Day 2026.

export interface GoldenBadgeRecipient {
  rank: number
  id: string
  roll_number: string
  full_name: string
  department: string
}

export const GOLDEN_BADGE_RECIPIENTS: GoldenBadgeRecipient[] = [
  { rank: 0,  id: '2154f319-4fa7-47e0-8bae-968baef0a165', roll_number: '242068',     full_name: 'Krish',             department: 'BCA' },
  { rank: 1,  id: '6f46d17e-244c-4a66-97b3-6df1645cd78c', roll_number: '242072',     full_name: 'somay Kumar',       department: 'BCA' },
  { rank: 2,  id: 'ab9edf42-9333-4540-b059-90a83ee58ede', roll_number: '242052',     full_name: 'Sonam Kaushik',     department: 'BCA' },
  { rank: 3,  id: 'b6784ff5-c71d-41fe-acbd-ce5de364ec70', roll_number: '240112',     full_name: 'Tushar',            department: 'B.Tech' },
  { rank: 4,  id: '8bbf27f4-4b03-4ad7-b494-fdfaab9be7a1', roll_number: '240115',     full_name: 'Nitin Gautam',      department: 'BCA' },
  { rank: 5,  id: 'b2856e70-ad20-4cc9-8138-5410344b5c6b', roll_number: '242048',     full_name: 'RAMAVTAR',          department: 'BCA' },
  { rank: 6,  id: 'c6b35fab-94ca-487d-9348-75f3646f44ec', roll_number: '242035',     full_name: 'Anjali Gaut',       department: 'BCA' },
  { rank: 7,  id: '5d254a9e-4262-446b-9ceb-2598881d04f0', roll_number: '250803040',  full_name: 'Yashshwani kalyan', department: 'BCA' },
  { rank: 8,  id: 'ad81ac8a-ea01-4d3c-a8d9-c5121f901493', roll_number: '250801010',  full_name: 'Dhruv nirwan',      department: 'MCA' },
  { rank: 9,  id: 'de16e375-d560-4007-bc5b-4a45c6e06417', roll_number: '250801022',  full_name: 'Yashuuu',           department: 'MCA' },
  { rank: 10, id: 'cd1b2edf-92e6-4b4e-86e6-cb0e96fcfc33', roll_number: '250802005',  full_name: 'anvi Choudhary',    department: 'B.Tech' },
  { rank: 11, id: 'ecefc0b4-72d8-4714-aa76-4da29f197a98', roll_number: '250802013',  full_name: 'Vansh Gautam',      department: 'B.Tech' },
  { rank: 12, id: '2cb7492d-17db-419d-ae6b-b410fc7ae1bf', roll_number: '250803012',  full_name: 'SANEHA',            department: 'BCA' },
  { rank: 13, id: '5f3af15e-8614-4a05-b867-2ca1d92e61b3', roll_number: '250802015',  full_name: 'Anurag Alyan',      department: 'B.Tech' },
  { rank: 14, id: '36e3b9a5-0a78-48d6-8571-5617e74cf8a5', roll_number: '240130',     full_name: 'Sushma Patlan',     department: 'B.Tech' },
  { rank: 15, id: 'cbf6b807-a2a6-4386-a7f9-dfbf1b132940', roll_number: '250802016',  full_name: 'Harsh Dixit',       department: 'B.Tech' },
  { rank: 16, id: '0dd957ad-fd83-4519-b84d-fc6ab30a2861', roll_number: '250802027',  full_name: 'Atul Saini',        department: 'B.Tech' },
  { rank: 17, id: 'a9ec20e1-7753-482a-92c9-6d46eaef8eaa', roll_number: '260805005',  full_name: 'Muskan Saini',      department: 'MCA' },
  { rank: 18, id: '7f0129c9-7293-4db9-a735-6cc3c5fbfc69', roll_number: '260805007',  full_name: 'Annu Garg',         department: 'MCA' },
  { rank: 19, id: '5ee6cc66-3b15-4161-9af1-71cc42507cc3', roll_number: '260806003',  full_name: 'Annu Shimar',       department: 'B.Tech' },
  { rank: 20, id: '4e712b6c-294e-401d-a90e-eab702e57943', roll_number: '260805008',  full_name: 'Chetna Kapoor',     department: 'MCA' },
  { rank: 21, id: '6b3cfea8-a8df-4327-91f4-43f09e028557', roll_number: '250801051',  full_name: 'Anjali Kataria',    department: 'B.Tech' },
  { rank: 22, id: 'f131d7f9-af9d-41ef-9ee3-11d6d9ee5a5e', roll_number: '479WW6',     full_name: 'Rohit',             department: 'MCA' },
  { rank: 23, id: 'f2dd7d06-26a2-4dfd-a150-19270cbedca6', roll_number: '2508020007', full_name: 'Sneha',             department: 'B.Tech' },
  { rank: 24, id: '3e462796-7fc6-4bed-aab3-ccef774a47df', roll_number: '250801007',  full_name: 'Abhishek Malik',    department: 'MCA' },
  { rank: 25, id: 'c871a158-126f-4232-a162-d8bc7e9d496a', roll_number: '260802018',  full_name: 'Varinda Atwal',     department: 'Computer Science & Engineering' },
]

const GOLDEN_IDS = new Set(GOLDEN_BADGE_RECIPIENTS.map(r => r.id))
const GOLDEN_ROLLS = new Set(GOLDEN_BADGE_RECIPIENTS.map(r => r.roll_number.toUpperCase()))

/**
 * Checks whether a given user or author object qualifies for the official Golden Tick.
 */
export function isGoldenVerified(
  user?: {
    id?: string | null
    roll_number?: string | null
    notification_preferences?: { golden_badge?: boolean } | null
  } | string | null
): boolean {
  if (!user) return false

  // If user is passed as an ID string
  if (typeof user === 'string') {
    return GOLDEN_IDS.has(user)
  }

  // Check ID
  if (user.id && GOLDEN_IDS.has(user.id)) return true

  // Check Roll Number
  if (user.roll_number && GOLDEN_ROLLS.has(String(user.roll_number).trim().toUpperCase())) {
    return true
  }

  // Check Notification Preferences / Profile JSON flag
  if (user.notification_preferences?.golden_badge) {
    return true
  }

  return false
}
