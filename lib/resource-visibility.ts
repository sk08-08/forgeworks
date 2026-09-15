export const RESOURCE_VISIBILITIES = [
  "public",
  "followers",
  "private",
] as const;

export type ResourceVisibility = (typeof RESOURCE_VISIBILITIES)[number];

export const DEFAULT_RESOURCE_VISIBILITY: ResourceVisibility = "private";

export const RESOURCE_VISIBILITY_COPY: Record<
  ResourceVisibility,
  {
    label: string;
    description: string;
  }
> = {
  public: {
    label: "Public",
    description: "Anyone can view this resource.",
  },
  followers: {
    label: "Followers",
    description: "Only you and people who follow you can view this resource.",
  },
  private: {
    label: "Private",
    description: "Only you can view this resource.",
  },
};

export function normalizeResourceVisibility(
  value: unknown,
  fallback: ResourceVisibility = DEFAULT_RESOURCE_VISIBILITY,
): ResourceVisibility {
  return RESOURCE_VISIBILITIES.includes(value as ResourceVisibility)
    ? (value as ResourceVisibility)
    : fallback;
}
