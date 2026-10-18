/**
 * Central University Constants
 * Single source of truth for Chaudhary Ranbir Singh University (CRSU) departments.
 */

export const DEPARTMENTS = [
  'Mathematics',
  'Physics',
  'Chemistry',
  'Computer Science',
  'Commerce',
  'Economics',
  'History',
  'Political Science',
  'English',
  'Hindi',
  'Punjabi',
  'Sociology',
  'Geography',
  'Law',
  'Management',
  'Education',
  'Physical Education',
  'Fine Arts',
  'Music',
  'Library Science',
  'Other',
] as const

export type Department = typeof DEPARTMENTS[number]
