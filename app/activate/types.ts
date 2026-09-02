export type InvitationPreview = {
  childName: string;
  daycareName: string;
  invitedFullName: string;
  email: string;
  relationship: "father" | "mother" | "guardian";
  expiresAt: string;
};
