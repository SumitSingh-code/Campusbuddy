/**
 * Central University Constants
 * Single source of truth for Chaudhary Ranbir Singh University (CRSU) departments.
 * Includes all active registered departments and university faculties without duplication.
 */

export const DEPARTMENTS = [
  'Computer Science & Engineering',
  'Computer science and applications',
  'DCSA (B.tech AI & ML)',
  'Information Technology',
  'Electronics & Communication Engineering',
  'Electrical Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
  'Commerce',
  'Management',
  'Economics',
  'Law',
  'Mathematics',
  'Physics',
  'Chemistry',
  'Political Science',
  'History',
  'English',
  'Hindi',
  'Punjabi',
  'Sociology',
  'Geography',
  'Education',
  'Physical Education',
  'Fine Arts',
  'Music',
  'Library Science',
  'Other',
] as const

export type Department = typeof DEPARTMENTS[number]
