import type { ReactNode } from "react";
import Link from "next/link";

function TermsSection({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="relative border-b border-border/50 py-8 first:pt-0 last:border-b-0 last:pb-0">
      <div className="grid gap-4 sm:grid-cols-[3rem_minmax(0,1fr)]">
        <div>
          <span className="inline-flex h-9 min-w-9 items-center justify-center rounded-xl border border-primary/15 bg-primary/7 px-2 font-mono text-[10px] font-semibold text-primary">
            {number}
          </span>
        </div>

        <div className="min-w-0">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            {title}
          </h2>

          <div className="mt-4 space-y-4 text-sm leading-7 text-muted-foreground sm:text-[15px]">
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}

function Subheading({ children }: { children: ReactNode }) {
  return (
    <h3 className="pt-2 text-sm font-semibold text-foreground">{children}</h3>
  );
}

function List({ children }: { children: ReactNode }) {
  return (
    <ul className="space-y-2.5 pl-5 marker:text-primary [&>li]:pl-1">
      {children}
    </ul>
  );
}

function Strong({ children }: { children: ReactNode }) {
  return <strong className="font-semibold text-foreground">{children}</strong>;
}

export function TermsContent() {
  return (
    <div>
      <TermsSection number="01" title="About these terms">
        <p>
          Forgeworks is an independent toolkit for creators to manage bots,
          forms, submissions, profiles, creator pages, collaboration, and
          related content.
        </p>

        <p>
          These Terms describe the basic rules for using the platform. By using
          Forgeworks, you agree to follow them. If you do not agree with the
          rules, please do not use the platform.
        </p>

        <p>
          Forgeworks is still in Beta. These Terms may change as features,
          moderation needs, and the project itself evolve.
        </p>
      </TermsSection>

      <TermsSection number="02" title="Age requirement">
        <p>
          You must be at least <Strong>18 years old</Strong> to use Forgeworks.
        </p>

        <p>
          By creating or using an account, you confirm that you meet this
          requirement.
        </p>
      </TermsSection>

      <TermsSection number="03" title="Your account">
        <p>Forgeworks accounts currently use a username and PIN.</p>

        <List>
          <li>Keep your PIN private.</li>
          <li>
            Do not intentionally give another person access to your account.
          </li>
          <li>
            If you believe somebody has gained unauthorized access, report it as
            soon as reasonably possible.
          </li>
          <li>
            You are responsible for activity performed through your account
            unless it resulted from a platform security issue or unauthorized
            access outside your reasonable control.
          </li>
        </List>
      </TermsSection>

      <TermsSection number="04" title="Your content">
        <p>
          You keep whatever rights you already have in the content you create,
          write, or upload to Forgeworks.
        </p>

        <p>
          Forgeworks does not claim ownership of your bots, writing, images,
          forms, Creator Pages, lore, or other creator content simply because
          you use the platform.
        </p>

        <p>
          You are responsible for making sure you have the right to upload or
          publish the content you place on Forgeworks.
        </p>

        <Subheading>Permission needed to operate the platform</Subheading>

        <p>
          When you upload, save, publish, or share content, you give Forgeworks
          the limited permission necessary to store, process, display, transmit,
          and otherwise handle that content so the feature you chose can work.
        </p>

        <p>
          For example, a public profile cannot work unless Forgeworks is allowed
          to display the profile information you chose to publish.
        </p>

        <Subheading>Backups are still a good idea</Subheading>

        <p>
          Forgeworks tries to protect stored content, but no Beta project or
          online service can promise that data will never be lost. Keep your own
          copy of anything you consider important.
        </p>
      </TermsSection>

      <TermsSection number="05" title="Public and shared content">
        <p>
          If you make something public, share a public link, or invite another
          creator into a collaboration, other people may be able to see that
          content.
        </p>

        <p>
          People who can see content may also be able to copy, screenshot, or
          otherwise retain it outside Forgeworks. The platform cannot control
          copies made outside its systems.
        </p>

        <p>
          Visibility and access settings should therefore be treated as tools
          for controlling access inside Forgeworks, not as a guarantee that
          something another person has already seen can be erased from their
          possession.
        </p>
      </TermsSection>

      <TermsSection number="06" title="Treat other people like people">
        <p>
          Forgeworks includes public profiles, forms, comments, collaboration,
          submissions, and other ways for people to interact. Do not use those
          tools to deliberately harm other users.
        </p>

        <p>In particular, do not:</p>

        <List>
          <li>Use Forgeworks for illegal activity.</li>
          <li>
            Harass, threaten, intimidate, or deliberately target another person.
          </li>
          <li>
            Use Forms or submissions to send abusive, threatening, or harmful
            messages to creators.
          </li>
          <li>Promote hatred or targeted abuse against protected groups.</li>
          <li>Impersonate another person in a deceptive or harmful way.</li>
          <li>
            Infringe intellectual-property rights you do not have permission to
            use.
          </li>
          <li>
            Upload malware, malicious scripts, or intentionally harmful files.
          </li>
          <li>
            Attempt to gain unauthorized access to accounts, data, moderation
            systems, or infrastructure.
          </li>
          <li>
            Spam, scrape, automate, or overload Forgeworks in ways that harm the
            service or its users.
          </li>
        </List>

        <p>
          Context matters. Moderation decisions may take into account intent,
          severity, repetition, and the effect on other users rather than
          relying only on one isolated word or action.
        </p>
      </TermsSection>

      <TermsSection number="07" title="Moderation">
        <p>
          Forgeworks does not manually review everything people create or
          submit.
        </p>

        <p>
          However, content, accounts, submissions, or activity may be reviewed,
          restricted, removed, or blocked when there is a reasonable reason to
          believe they violate these Terms, create a safety problem, abuse the
          service, or expose Forgeworks to legal or security risk.
        </p>

        <p>
          Moderation tools are imperfect. Automated flags do not necessarily
          mean a person has broken a rule, and they may be reviewed before
          further action is taken where appropriate.
        </p>
      </TermsSection>

      <TermsSection number="08" title="Collaboration">
        <p>
          Some Forgeworks tools allow creators to share access to bots or
          related workspaces.
        </p>

        <List>
          <li>
            Collaborators may be able to view or edit shared content according
            to the permissions they receive.
          </li>
          <li>
            Collaboration activity may be recorded so participants can
            understand what changed.
          </li>
          <li>
            Owners can remove collaborators where the feature supports it.
          </li>
          <li>
            Do not invite somebody to content you are not allowed to share with
            them.
          </li>
        </List>

        <p>
          Forgeworks provides collaboration tools, but it is not responsible for
          settling personal disagreements, creative ownership disputes, or
          private agreements between collaborators.
        </p>
      </TermsSection>

      <TermsSection number="09" title="Forms and requests">
        <p>
          Creators can use Forgeworks Forms to receive requests, suggestions,
          commissions, or other submissions.
        </p>

        <List>
          <li>
            Form creators are responsible for clearly communicating any
            conditions or expectations that matter to their submitters.
          </li>
          <li>
            Submitters are responsible for the content they send through a form.
          </li>
          <li>
            Forgeworks provides the form and workflow tools but is not a party
            to private agreements made between creators and submitters.
          </li>
          <li>
            Forgeworks does not currently process payments or act as a
            marketplace.
          </li>
        </List>

        <p>
          Payment disputes, delivery promises, commission terms, refunds, and
          similar arrangements must be handled between the people involved
          unless Forgeworks later introduces a feature that explicitly says
          otherwise.
        </p>
      </TermsSection>

      <TermsSection number="10" title="Forgeworks itself">
        <p>
          User-created content is separate from Forgeworks&apos;s own branding,
          original interface, platform code, documentation, and other project
          materials.
        </p>

        <p>
          Please do not copy or redistribute Forgeworks&apos;s project materials
          in a way that falsely presents them as your own, creates confusion
          about who operates the platform, or violates applicable rights or
          licenses.
        </p>
      </TermsSection>

      <TermsSection number="11" title="Third-party services and links">
        <p>
          Forgeworks depends on external infrastructure, currently including
          services such as Vercel and Supabase.
        </p>

        <p>
          Forgeworks may also display links added by creators or community
          members. External services have their own rules, availability,
          security, and privacy practices. Forgeworks does not control what
          happens once you visit another service.
        </p>
      </TermsSection>

      <TermsSection number="12" title="Privacy">
        <p>
          The{" "}
          <Link
            href="/privacy"
            className="font-medium text-primary transition-opacity hover:opacity-75"
          >
            Privacy Policy
          </Link>{" "}
          explains what information Forgeworks handles and how the platform uses
          it.
        </p>

        <p>
          Please read it if you want to understand account information, public
          content, submissions, security data, and deletion more clearly.
        </p>
      </TermsSection>

      <TermsSection number="13" title="Beta software and availability">
        <p>
          Forgeworks is provided on an <Strong>as-is Beta basis</Strong>.
        </p>

        <p>
          Features may contain bugs, behave unexpectedly, be unavailable for a
          period of time, or change as development continues. Some experimental
          features may also be redesigned or removed.
        </p>

        <p>
          Forgeworks does not guarantee uninterrupted availability, permanent
          storage, or that every feature will remain exactly as it exists today.
        </p>
      </TermsSection>

      <TermsSection number="14" title="Account suspension and deletion">
        <p>
          You can delete your own account through the platform where that option
          is available.
        </p>

        <p>
          Forgeworks may temporarily restrict, suspend, or remove an account
          when reasonably necessary to address serious or repeated rule
          violations, security issues, abuse, or legal obligations.
        </p>

        <p>
          Where practical, moderation should be proportionate to the issue
          involved rather than treating every mistake as equally serious.
        </p>
      </TermsSection>

      <TermsSection number="15" title="Changes to Forgeworks or these terms">
        <p>
          Forgeworks is actively developed. Features may be added, rebuilt,
          changed, or removed.
        </p>

        <p>
          These Terms may also be updated when the platform changes or when a
          rule needs clarification. Meaningful changes will update the date
          shown at the top of the page and may be announced through Forgeworks
          where appropriate.
        </p>
      </TermsSection>

      <TermsSection number="16" title="If there is a problem">
        <p>
          If you believe something involving Forgeworks has gone wrong,
          reporting the issue through the platform is usually the best first
          step.
        </p>

        <p>
          The project is independently maintained, so reports that clearly
          explain what happened, where it happened, and what you expected are
          especially useful.
        </p>
      </TermsSection>
    </div>
  );
}
