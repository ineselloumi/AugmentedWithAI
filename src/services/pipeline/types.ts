// Stage 1 — raw Grok discovery output
export interface DiscoveryItem {
  name: string;
  category: string;
  publishedAt?: string;       // date of announcement, e.g. "2026-05-03"
  announcementUrl?: string;   // official blog / press release / product page
  authorityTweets?: string[]; // tweet URLs from well-known AI voices
  urls: string[];             // all URLs combined (for verification)
  raw_quote: string;          // verbatim from source, no paraphrase
}

// Stage 2 — per-URL verification result
export type SourceStatus = "verified" | "partial" | "failed";

export interface VerifiedSource {
  url: string;
  status: SourceStatus;
  isTweet: boolean;
  title?: string;
  content?: string; // first ~600 chars of readable content
}

// Stage 2 — item after verification
export interface VerifiedItem {
  name: string;
  category: string;
  publishedAt?: string;
  announcementUrl?: string;
  authorityTweets?: string[];
  raw_quote: string;
  status: "verified" | "partial"; // "failed" items are dropped
  sources: VerifiedSource[];
}

// Stage 3 — fully synthesised report item
export interface ReportItem {
  name: string;
  category: string;
  type: string;
  publishedAt?: string;       // date of announcement/release
  announcementUrl?: string;   // primary source link
  authorityTweets?: string[]; // tweet URLs from notable AI voices
  description: string;
  why_trending: string;
  evidence: { text: string; author: string; url: string | null }[];
  verification_status: "verified" | "partial";
  sources: string[]; // canonical URLs shown to subscribers
}

// Full pending report (awaiting review)
export interface PendingReport {
  id: string;
  token: string;
  date: string; // YYYY-MM-DD
  createdAt: number;
  status: "pending" | "approved" | "discarded";
  items: ReportItem[];
  dropped: { name: string; reason: string }[];
  stats: {
    discovered: number;
    verified: number;
    partial: number;
    dropped: number;
  };
}
