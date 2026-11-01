/**
 * Central University Constants
 * Single source of truth for Chaudhary Ranbir Singh University (CRSU) streams and departments.
 * Includes all active registered streams and university faculties without duplication.
 */

export const DEPARTMENTS = [
  // Primary Student Streams (Top Priority)
  'B.Tech',
  'BCA',
  'MCA',
  'B.Com',
  'BA',
  'BBA',
  'LLB',
  'Hotel Management',
  'Mass Communication',

  // Postgraduate & Specialized Programs
  'MBA',
  'M.Sc',
  'MA',

  // University Engineering & Science Departments
  'Computer Science & Engineering',
  'Information Technology',
  'Electronics & Communication Engineering',
  'Electrical Engineering',
  'Mechanical Engineering',
  'Civil Engineering',

  // University Academic Faculties
  'Economics',
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
