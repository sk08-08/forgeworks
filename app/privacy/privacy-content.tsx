import type { ReactNode } from "react";
import Link from "next/link";

function PolicySection({
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

export function PrivacyContent() {
  return (
    <div>
      <PolicySection number="01" title="About this policy">
        <p>
          Forgeworks is an independent creator toolkit for managing bots, forms,
          submissions, profiles, creator pages, collaboration, and related
          content.
        </p>

        <p>
          This Privacy Policy explains what information the platform handles,
          why that information is needed, and what choices you have. The goal is
          to keep this understandable instead of filling the page with
          unnecessary legal language.
        </p>

        <p>
          By using Forgeworks, you acknowledge this Privacy Policy. The{" "}
          <Link
            href="/terms"
            className="font-medium text-primary transition-opacity hover:opacity-75"
          >
            Terms of Service
          </Link>{" "}
          explain the separate rules for using the platform.
        </p>
      </PolicySection>

      <PolicySection number="02" title="Information Forgeworks handles">
        <Subheading>Account information</Subheading>

        <p>An account currently uses:</p>

        <List>
          <li>
            <Strong>Username</Strong> — the name you choose for your account.
          </li>

          <li>
            <Strong>PIN</Strong> — the code used to authenticate your account.
            Authentication is handled through the platform&apos;s authentication
            system rather than being exposed as readable profile information.
          </li>
        </List>

        <p>
          Forgeworks does not require you to provide a normal email address to
          register. A technical authentication identifier may be created
          internally so the account system can function.
        </p>

        <Subheading>Optional profile information</Subheading>

        <p>
          Depending on what you choose to add, your profile may contain things
          such as:
        </p>

        <List>
          <li>Display name, pronouns, bio, tagline, and status.</li>
          <li>Avatar and banner images.</li>
          <li>Location or website information you choose to publish.</li>
          <li>Social usernames or links.</li>
          <li>Specialties and profile appearance settings.</li>
        </List>

        <Subheading>Content you create or submit</Subheading>

        <p>
          Forgeworks stores content needed for the features you use. This may
          include:
        </p>

        <List>
          <li>Bots and their character information.</li>
          <li>Forms, form configuration, and submissions.</li>
          <li>Creator Pages and their sections.</li>
          <li>Worlds, lorebooks, and Atlas content.</li>
          <li>Comments, community activity, and reactions.</li>
          <li>Collaboration records and activity.</li>
          <li>Feedback, bug reports, or suggestions you send.</li>
        </List>

        <Subheading>Technical and safety information</Subheading>

        <p>
          Hosting, authentication, and security systems may process standard
          technical information needed to operate a web service, such as request
          timestamps, browser or device information, and network information.
        </p>

        <p>
          In particular, public form submissions may involve limited network
          information such as an IP address for purposes including abuse
          prevention, rate limiting, moderation, security review, and blocking
          repeat offenders.
        </p>
      </PolicySection>

      <PolicySection number="03" title="What Forgeworks does not require">
        <p>
          Forgeworks is intentionally designed to require relatively little
          personal information.
        </p>

        <p>The platform does not require:</p>

        <List>
          <li>A real email address to create an account.</li>
          <li>A phone number.</li>
          <li>A physical mailing address.</li>
          <li>Government identification.</li>
          <li>Payment information, since Forgeworks is currently free.</li>
          <li>Biometric information.</li>
          <li>Precise GPS location.</li>
        </List>

        <p>
          This does not prevent users from voluntarily placing personal
          information inside a profile, form response, comment, feedback
          message, or other content field. Please avoid sharing information you
          do not want stored or seen by the relevant audience.
        </p>
      </PolicySection>

      <PolicySection number="04" title="How the information is used">
        <p>
          Information is used only where it is reasonably needed to operate,
          protect, or improve Forgeworks.
        </p>

        <List>
          <li>Authenticate your account and keep it accessible to you.</li>
          <li>Store and display the content you create.</li>
          <li>Deliver and organize form submissions.</li>
          <li>Enable collaboration and notifications.</li>
          <li>Apply profile, resource, and visibility settings.</li>
          <li>Moderate abusive or suspicious submissions.</li>
          <li>Prevent spam, automated abuse, or unauthorized access.</li>
          <li>Respond to feedback and bug reports.</li>
          <li>Maintain and improve platform reliability.</li>
          <li>Comply with applicable legal obligations when required.</li>
        </List>
      </PolicySection>

      <PolicySection number="05" title="Public, private, and shared content">
        <p>
          Some parts of Forgeworks are designed to be public while others are
          private or limited by access settings.
        </p>

        <List>
          <li>
            Profile information may be visible according to your profile
            visibility settings.
          </li>

          <li>
            Content you deliberately publish may be accessible without signing
            in.
          </li>

          <li>
            Public or shareable Forms can be opened by people who receive their
            links.
          </li>

          <li>
            Collaborators can access the shared information permitted by their
            role.
          </li>

          <li>
            Community posts, comments, reactions, and similar public activity
            may be visible to other users.
          </li>
        </List>

        <p>
          Making something public or sharing it with another person means they
          may be able to copy or retain what they can see. Forgeworks cannot
          control what another person does with information after they receive
          it outside the platform.
        </p>
      </PolicySection>

      <PolicySection number="06" title="Infrastructure and service providers">
        <p>
          Forgeworks relies on third-party infrastructure to function. The main
          providers currently include:
        </p>

        <List>
          <li>
            <Strong>Vercel</Strong> — hosting and delivery of the web
            application.
          </li>

          <li>
            <Strong>Supabase</Strong> — authentication, database, and storage
            infrastructure.
          </li>
        </List>

        <p>
          These providers may process technical data as necessary to provide
          their services. Forgeworks does not sell user information to
          advertisers.
        </p>

        <p>
          If infrastructure providers change in the future, this policy may be
          updated accordingly.
        </p>
      </PolicySection>

      <PolicySection number="07" title="Cookies and local preferences">
        <p>
          Forgeworks uses browser storage and authentication mechanisms needed
          to keep the application working.
        </p>

        <List>
          <li>
            Authentication data may be stored so you can remain signed in.
          </li>

          <li>
            Local browser storage may remember interface preferences such as
            navigation state.
          </li>

          <li>
            Hosting infrastructure may use technically necessary cookies or
            similar mechanisms as part of providing the service.
          </li>
        </List>

        <p>
          Blocking required browser storage may prevent some features, including
          authentication, from working correctly.
        </p>
      </PolicySection>

      <PolicySection number="08" title="Retention and deletion">
        <p>
          Active account and creator data is generally kept for as long as it is
          needed to provide the features you use.
        </p>

        <p>
          When an account or content is deleted, Forgeworks removes or schedules
          removal of associated information where technically supported. Some
          residual information may temporarily remain in backups, logs, cached
          systems, moderation records, or storage infrastructure.
        </p>

        <p>
          Content that was shared with collaborators or copied outside
          Forgeworks may also continue to exist independently of your account.
        </p>

        <p>
          Security and abuse-prevention records may be retained for a reasonable
          period where they are needed to protect the platform or investigate
          misuse.
        </p>
      </PolicySection>

      <PolicySection number="09" title="Security">
        <p>
          Forgeworks uses technical safeguards intended to reduce unauthorized
          access and protect stored information.
        </p>

        <List>
          <li>Encrypted HTTPS connections for data in transit.</li>
          <li>Authentication controls for account access.</li>
          <li>
            Database access rules designed to limit users to information they
            are allowed to access.
          </li>
          <li>
            Permission checks for collaborative and administrative actions.
          </li>
          <li>
            Abuse-prevention and moderation controls for public submissions.
          </li>
        </List>

        <p>
          No online service can guarantee perfect security. Forgeworks is
          actively developed, and security-related issues are treated as
          something to investigate and improve rather than something the project
          claims can never happen.
        </p>
      </PolicySection>

      <PolicySection number="10" title="Your controls and privacy rights">
        <p>
          Forgeworks provides direct controls for much of the information
          associated with your account.
        </p>

        <List>
          <li>View and edit your profile.</li>
          <li>Change profile visibility settings.</li>
          <li>Create, edit, publish, unpublish, or remove creator content.</li>
          <li>Manage collaborators where supported.</li>
          <li>Delete your account through platform settings.</li>
          <li>Ask about the information associated with your account.</li>
        </List>

        <p>
          Depending on where you live, local privacy law may give you additional
          rights concerning access, correction, deletion, restriction, or
          objection to certain processing.
        </p>

        <p>
          If you need help exercising a privacy-related right that is not
          available directly in the interface, contact Forgeworks through the
          platform.
        </p>
      </PolicySection>

      <PolicySection number="11" title="Age requirement">
        <p>
          Forgeworks is intended for users who are at least{" "}
          <Strong>18 years old</Strong>.
        </p>

        <p>
          Forgeworks does not knowingly maintain accounts belonging to users
          known to be under that age. If an underage account is identified,
          appropriate action may be taken, including removal of the account.
        </p>
      </PolicySection>

      <PolicySection number="12" title="Third-party links">
        <p>
          Profiles, Creator Pages, community content, and other parts of
          Forgeworks may contain links to external websites or services.
        </p>

        <p>
          Forgeworks does not control those sites or their privacy practices.
          Once you leave Forgeworks, the destination&apos;s own policies apply.
        </p>
      </PolicySection>

      <PolicySection number="13" title="Changes to this policy">
        <p>
          Forgeworks is still in Beta, so the platform and the information it
          needs may change over time.
        </p>

        <p>
          If this Privacy Policy changes meaningfully, the date at the top will
          be updated. Important changes may also be communicated through the
          platform where appropriate.
        </p>
      </PolicySection>

      <PolicySection number="14" title="Questions or concerns">
        <p>
          If something about this policy is unclear, or you have a concern about
          information connected to your account, please reach out through
          Forgeworks.
        </p>

        <p>
          The project is still independently maintained, so straightforward
          questions and reports are genuinely useful.
        </p>
      </PolicySection>
    </div>
  );
}
