/**
 * Types for Git/commit monitoring
 */

export interface CommitInfo {
  hash: string
  shortHash: string
  author: string
  authorEmail: string
  date: Date
  message: string
  filesChanged: number
  insertions: number
  deletions: number
  branch: string
}

export interface GitStats {
  totalCommits: number
  totalAuthors: number
  mostActiveAuthor: string
  averageCommitsPerDay: number
  lastCommit: CommitInfo | null
  branchCount: number
  currentBranch: string
  uncommittedChanges: number
}

export interface RepositoryHealth {
  hasUncommittedChanges: boolean
  hasUnpushedCommits: boolean
  branchUpToDate: boolean
  lastCommitAge: number // hours
  commitFrequency: 'active' | 'moderate' | 'stale' // last 7 days
}
