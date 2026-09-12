import { notFound } from "next/navigation";
import Link from "next/link";

import { ArrowLeft, BookOpen, ExternalLink, Star } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MarkdownRenderer } from "@/features/markdown/components/markdown-renderer";

import {
  RESOURCE_TYPE_LABELS,
  type ResourceType,
} from "@/features/hub/resources/lib/resource-utils";

import { ResourceInteractionPanel } from "@/features/hub/resources/components/resource-interaction-panel";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function ResourcePage({ params }: PageProps) {
  const { slug } = await params;

  const supabase = await createClient();

  const { data: entry } = await supabase
    .from("hub_resource_entries")
    .select(
      `
      id,
      slug,
      title,
      excerpt,
      summary,
      url,
      label,
      resource_type,
      contributor_user_id,
      is_platform_pinned,
      is_published,
      created_at,
      updated_at,
      section:hub_resource_sections(
        id,
        title,
        description,
        accent_color,
        is_published
      ),
      contributor:profiles!hub_resource_entries_contributor_user_id_fkey(
        username,
        display_name,
        avatar_url
      )
      `,
    )
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (!entry) {
    notFound();
  }

  const section = Array.isArray(entry.section)
    ? (entry.section[0] ?? null)
    : entry.section;

  const contributor = Array.isArray(entry.contributor)
    ? (entry.contributor[0] ?? null)
    : entry.contributor;

  const { data: related } = section?.id
    ? await supabase
        .from("hub_resource_entries")
        .select(
          `
          id,
          slug,
          title,
          excerpt,
          resource_type,
          is_platform_pinned
          `,
        )
        .eq("section_id", section.id)
        .eq("is_published", true)
        .neq("id", entry.id)
        .order("is_platform_pinned", {
          ascending: false,
        })
        .order("updated_at", {
          ascending: false,
        })
        .limit(3)
    : { data: [] };

  const accentColor = section?.accent_color || "#7c3aed";

  const typeLabel =
    RESOURCE_TYPE_LABELS[(entry.resource_type || "other") as ResourceType];

  const { data: sectionOptions } = await supabase
    .from("hub_resource_sections")
    .select("id, title")
    .eq("is_published", true)
    .order("sort_order", {
      ascending: true,
    });

  return (
    <main className="relative min-h-screen overflow-x-clip bg-background">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute -left-48 top-20 h-[30rem] w-[30rem] rounded-full bg-purple-500/[0.07] blur-[120px]" />
        <div className="absolute -right-52 top-[30rem] h-[28rem] w-[28rem] rounded-full bg-pink-500/[0.06] blur-[120px]" />
      </div>

      <div className="mx-auto w-full max-w-[92rem] px-3 pb-20 pt-5 sm:px-6 sm:pt-6 lg:px-8">
        <nav className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
          <Link
            href="/resources"
            className="group inline-flex items-center gap-2 transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            Resources
          </Link>

          {section && (
            <>
              <span className="text-border">/</span>
              <span className="min-w-0 break-words">{section.title}</span>
            </>
          )}
        </nav>

        <section className="dashboard-hero relative mt-6 isolate overflow-hidden rounded-[2rem] border border-border/70 px-4 py-8 shadow-xl shadow-black/5 dark:shadow-primary/10 sm:mt-7 sm:px-9 sm:py-12 lg:px-12">
          <div className="relative z-10 max-w-4xl">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="rounded-full" variant="secondary">
                {typeLabel}
              </Badge>

              {section && (
                <Badge
                  variant="outline"
                  className="rounded-full bg-background/40 backdrop-blur"
                >
                  {section.title}
                </Badge>
              )}

              {entry.is_platform_pinned && (
                <Badge
                  variant="outline"
                  className="rounded-full border-amber-400/40 bg-amber-400/[0.06] text-amber-600 dark:text-amber-400"
                >
                  <Star className="mr-1 h-3 w-3 fill-current" />
                  Forge Pick
                </Badge>
              )}
            </div>

            <h1 className="mt-6 max-w-4xl break-words text-balance text-3xl font-bold tracking-tight sm:text-5xl xl:text-6xl">
              {entry.title}
            </h1>

            {entry.excerpt && (
              <div className="mt-5 max-w-3xl text-base leading-8 text-muted-foreground sm:text-lg">
                <MarkdownRenderer
                  content={entry.excerpt}
                  className={[
                    "text-base leading-8 text-muted-foreground sm:text-lg",
                    "[&>*]:my-0",
                    "[&_p]:my-0",
                    "[&_h1]:text-lg",
                    "[&_h2]:text-lg",
                    "[&_h3]:text-lg",
                    "[&_h4]:text-base",
                    "[&_h5]:text-base",
                    "[&_h6]:text-base",
                  ].join(" ")}
                />
              </div>
            )}

            <div className="mt-7 flex min-w-0 flex-col items-start gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
              {contributor?.username ? (
                <Link
                  href={`/profile/${contributor.username}`}
                  className="group flex min-w-0 items-center gap-3"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-sm font-semibold text-primary shadow-sm">
                    {(contributor.display_name || contributor.username || "U")
                      .charAt(0)
                      .toUpperCase()}
                  </div>

                  <div className="min-w-0">
                    <p className="break-words text-sm font-medium transition-colors group-hover:text-primary">
                      {contributor.display_name || `@${contributor.username}`}
                    </p>

                    <p className="text-xs text-muted-foreground">
                      @{contributor.username}
                    </p>
                  </div>
                </Link>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary">
                    <BookOpen className="h-4 w-4" />
                  </div>

                  <div>
                    <p className="text-sm font-medium">Forgeworks</p>

                    <p className="text-xs text-muted-foreground">
                      Curated resource
                    </p>
                  </div>
                </div>
              )}

              <div className="hidden h-8 w-px bg-border/60 sm:block" />

              <p className="text-xs text-muted-foreground">
                Updated{" "}
                {new Date(entry.updated_at).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>
        </section>

        <div className="mt-10 grid min-w-0 items-start gap-8 xl:mt-12 xl:grid-cols-[minmax(0,1fr)_18rem] xl:gap-12">
          <div className="min-w-0">
            <article className="min-w-0 px-1 sm:px-3">
              <MarkdownRenderer
                content={entry.summary || "No content available."}
                className="prose max-w-none break-words dark:prose-invert prose-headings:scroll-mt-24 prose-headings:tracking-tight prose-p:leading-7 prose-li:leading-7 [&_a]:break-all [&_code]:break-words [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_table]:block [&_table]:max-w-full [&_table]:overflow-x-auto"
              />
            </article>
          </div>

          <aside className="min-w-0 xl:sticky xl:top-6 xl:self-start">
            <div className="space-y-4">
              <div className="rounded-3xl border border-border/70 bg-card/80 p-5 shadow-md shadow-black/[0.04] backdrop-blur">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-xl"
                    style={{
                      color: accentColor,
                      backgroundColor: `${accentColor}18`,
                    }}
                  >
                    <BookOpen className="h-4 w-4" />
                  </div>

                  <div>
                    <p className="text-sm font-semibold">Resource info</p>

                    <p className="text-[11px] text-muted-foreground">
                      Details and source
                    </p>
                  </div>
                </div>

                <dl className="mt-6 space-y-5 text-sm">
                  {section && (
                    <div>
                      <dt className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
                        Category
                      </dt>

                      <dd className="mt-1.5 break-words font-medium">
                        {section.title}
                      </dd>
                    </div>
                  )}

                  <div>
                    <dt className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
                      Type
                    </dt>

                    <dd className="mt-1.5 break-words font-medium">
                      {typeLabel}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
                      Last updated
                    </dt>

                    <dd className="mt-1.5 text-muted-foreground">
                      {new Date(entry.updated_at).toLocaleDateString()}
                    </dd>
                  </div>
                </dl>

                {entry.url && (
                  <Button
                    asChild
                    variant="outline"
                    className="mt-6 w-full cursor-pointer rounded-full"
                  >
                    <a
                      href={entry.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Original source
                      <ExternalLink className="ml-2 h-4 w-4" />
                    </a>
                  </Button>
                )}
              </div>

              <Link
                href="/resources"
                className="group flex min-w-0 items-center justify-between gap-3 rounded-2xl border border-border/60 bg-muted/20 px-4 py-3 text-sm text-muted-foreground shadow-sm transition-all duration-300 hover:border-primary/20 hover:bg-primary/5 hover:text-foreground"
              >
                Browse all resources
                <ArrowLeft className="h-4 w-4 rotate-180 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </aside>
        </div>

        <div className="my-12 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

        <section className="w-full">
          <ResourceInteractionPanel
            entryId={entry.id}
            contributorUserId={entry.contributor_user_id}
            sections={sectionOptions || []}
            resource={{
              id: entry.id,
              sectionId: section?.id || "",
              title: entry.title,
              summary: entry.summary || "",
              url: entry.url || "",
              label: entry.label || "",
            }}
          />
        </section>

        {related && related.length > 0 && (
          <section className="mt-14">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-primary">
                Keep exploring
              </p>

              <h2 className="mt-1 text-2xl font-semibold tracking-tight">
                Related resources
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                More useful content from {section?.title || "the library"}.
              </p>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {related.map((item) => (
                <Link
                  key={item.id}
                  href={`/resources/${item.slug}`}
                  className="group relative overflow-hidden rounded-3xl border border-border/70 bg-card/90 p-5 shadow-md shadow-black/[0.04] transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/[0.07]"
                >
                  <div className="pointer-events-none absolute -right-12 -top-12 h-28 w-28 rounded-full bg-primary/[0.05] blur-3xl" />

                  <Badge variant="secondary" className="relative rounded-full">
                    {
                      RESOURCE_TYPE_LABELS[
                        (item.resource_type || "other") as ResourceType
                      ]
                    }
                  </Badge>

                  <h3 className="relative mt-4 break-words font-semibold leading-snug tracking-tight transition-colors group-hover:text-primary">
                    {item.title}
                  </h3>

                  {item.excerpt && (
                    <div className="relative mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">
                      <MarkdownRenderer
                        content={item.excerpt}
                        className={[
                          "text-sm leading-6 text-muted-foreground",
                          "[&>*]:my-0",
                          "[&_p]:my-0",
                          "[&_ul]:my-0",
                          "[&_ol]:my-0",
                          "[&_h1]:text-sm",
                          "[&_h2]:text-sm",
                          "[&_h3]:text-sm",
                          "[&_h4]:text-sm",
                          "[&_h5]:text-sm",
                          "[&_h6]:text-sm",
                        ].join(" ")}
                      />
                    </div>
                  )}

                  <div className="relative mt-5 flex justify-end">
                    <ArrowLeft className="h-4 w-4 rotate-180 text-muted-foreground transition-transform group-hover:translate-x-1" />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
