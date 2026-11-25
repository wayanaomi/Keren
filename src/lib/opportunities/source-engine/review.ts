export type ImportedEligibilityStatus =
  | "UNKNOWN"
  | "NEEDS_REVIEW"
  | "VERIFIED_ELIGIBLE"
  | "VERIFIED_INELIGIBLE";

export interface ImportedOpportunityPublicationReviewInput {
  verificationStatus: "VERIFIED" | "NEEDS_VERIFICATION" | "EXPIRED";
  eligibilityStatus: ImportedEligibilityStatus;
  eligibilityEvidenceUrl: string | null;
  officialUrls: Array<string | null>;
  deadline: Date | null;
  now?: Date;
}

export function isOfficialEvidenceUrl(
  evidenceUrl: string,
  officialUrls: Array<string | null>,
): boolean {
  let evidenceHost: string;

  try {
    const parsed = new URL(evidenceUrl);
    if (parsed.protocol !== "https:" || parsed.username || parsed.password) {
      return false;
    }
    evidenceHost = parsed.hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return false;
  }

  return officialUrls.some((value) => {
    if (!value) return false;
    try {
      const parsed = new URL(value);
      const officialHost = parsed.hostname.toLowerCase().replace(/^www\./, "");
      return (
        parsed.protocol === "https:" &&
        !parsed.username &&
        !parsed.password &&
        (evidenceHost === officialHost ||
          evidenceHost.endsWith(`.${officialHost}`))
      );
    } catch {
      return false;
    }
  });
}

/**
 * Imported opportunities require two independent administrator decisions:
 * verify the official notice, then verify applicant eligibility with evidence
 * from the same official publisher. A past deadline blocks publication.
 */
export function getImportedOpportunityPublicationError(
  input: ImportedOpportunityPublicationReviewInput,
): string | null {
  if (input.verificationStatus !== "VERIFIED") {
    return "Verify the official notice before publishing this imported opportunity.";
  }

  if (input.eligibilityStatus !== "VERIFIED_ELIGIBLE") {
    return "Only opportunities with an evidence-backed Verified eligible assessment can be published.";
  }

  if (
    !input.eligibilityEvidenceUrl ||
    !isOfficialEvidenceUrl(input.eligibilityEvidenceUrl, input.officialUrls)
  ) {
    return "Eligibility evidence must link to the same official publisher host as the imported notice.";
  }

  const now = input.now ?? new Date();
  if (input.deadline && input.deadline.getTime() < now.getTime()) {
    return "An opportunity with a past deadline cannot be published as open.";
  }

  return null;
}
