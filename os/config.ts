// ─────────────────────────────────────────────
// EVENT CONFIG ~ Claude for Business
// Edit this file to change scripts, segments, order, etc.
// Save the file and hard-refresh the OS tab.
// ─────────────────────────────────────────────

export type BlockType = 'scripted' | 'bullets' | 'stage' | 'poll' | 'workbook';

export interface Block {
  type: BlockType;
  speaker?: string;
  text?: string;
  items?: string[];
}

export interface Beat {
  id: string;
  title: string;
  speaker: string;
  blocks: Block[];
}

export interface Segment {
  id: number;
  num: string;
  title: string;
  titleItalic: string;
  subtitle: string;
  duration: string;
  speakers: string[];
  panel: 'demo' | 'compare' | 'products' | 'showcase' | 'qa';
  panelData?: string;
  panelUrl?: string;
  audWhatTitle: string;
  audWhatBody: string;
  audTakeaway: string;
  beats: Beat[];
}

export interface ComparePreset {
  scenario: string;
  leftTag: string;
  leftTitle: string;
  leftWhy: string;
  leftPrompt: string;
  leftAnswer: string;
  leftAnnLbl: string;
  leftAnnTxt: string;
  rightTag: string;
  rightTitle: string;
  rightWhy: string;
  rightPrompt: string;
  rightAnswer: string;        // Step 1: Claude's first response (asks questions)
  rightBridge?: string;       // Optional bridge sentence Claude uses to pivot to drafts
  rightDrafts?: { label: string; body: string }[]; // Step 2: Claude offers multiple draft variations
  rightAnnLbl: string;
  rightAnnTxt: string;
  landing: string;
}

export const SPEAKERS: Record<string, { name: string; color: string }> = {
  ABIE: { name: 'Abie', color: '#FAF8F5' },
  MERI: { name: 'Meri', color: '#7D6B5A' },
  BOTH: { name: 'Both', color: '#9C8B7A' },
};

export const COMPARE_PRESETS: Record<string, ComparePreset> = {
  'chatgpt-vs-claude': {
    scenario: "Same prompt sent to both. Watch how each one responds.",
    leftTag: '✕ ChatGPT',
    leftTitle: '<em>Just answers</em>',
    leftWhy: 'Fills in the blanks and gives you a generic template.',
    leftPrompt: 'write me an invoice reminder',
    leftAnswer: "Subject: Friendly Invoice Reminder\n\nHi [Client Name],\n\nI hope this email finds you well. I'm writing to follow up on the outstanding invoice that was sent on [date]. As of today, payment has not yet been received.\n\nThe total amount due is [amount]. Please let me know if you have any questions or if there is anything I can do to help facilitate payment.\n\nI would appreciate it if you could process the payment at your earliest convenience.\n\nThank you for your prompt attention to this matter.\n\nBest regards,\n[Your Name]",
    rightTag: '✓ Claude',
    rightTitle: '<em>Asks first</em>',
    rightWhy: 'Pauses and asks for the context that makes the email actually work.',
    rightPrompt: 'write me an invoice reminder',
    rightAnswer: "Happy to help ~ three quick things so I get the framing and tone right:\n\n1. Who's the client and how overdue is it?\n2. What outcome do you want ~ a gentle nudge, a firm reminder, or a final notice?\n3. How do you usually sound with them ~ formal, casual, warm, brisk?\n\nOnce you tell me, I'll draft a few versions in your voice.",
    rightBridge: "Or, if you'd rather skip the questions, here are 3 ready-to-send versions in different tones ~ pick the one closest to your vibe:",
    rightDrafts: [
      {
        label: 'A · Gentle nudge',
        body: "Subject: Quick check-in\n\nHey Sarah,\n\nHope all's well! Friendly heads-up that invoice INV-204 (€450) is just past its due date ~ totally understand things slip when you're busy.\n\nIf it's easier, here's a one-click Stripe link to settle: [stripe link]\n\nLet me know if anything's stuck on your end,\nMeri",
      },
      {
        label: 'B · Firm reminder',
        body: "Subject: INV-204 · 7 days overdue\n\nHi Sarah,\n\nFollowing up on invoice INV-204 (€450) ~ it's now a week past due and I haven't seen payment land. Could we get this settled by end of week?\n\nStripe link for one-click pay → [stripe link]\n\nThanks,\nMeri",
      },
      {
        label: 'C · Playful + warm',
        body: "Subject: INV-204 fell asleep on the way home\n\nHey Sarah!\n\nYour invoice INV-204 took a little nap (€450, 7 days late). Quick zap to wake it up → [stripe link]\n\nIf there's a snag, lmk and I'll sort it,\nMeri",
      },
    ],
    leftAnnLbl: "What ChatGPT did",
    leftAnnTxt: "Gave you a finished template with [placeholders] you still have to fill in. You're back to doing the personalising work yourself.",
    rightAnnLbl: 'What Claude did',
    rightAnnTxt: "Refused to guess. Asked about the situation, the framing, and your tone of voice ~ the three things that turn a generic email into one that sounds like you and actually gets paid.",
    landing: "Same prompt. Different mindset. <em>Claude treats you like a thinking partner</em>, not a search bar.",
  },
};

export const SEGMENTS: Segment[] = [
  // 00 ~ Welcome
  {
    id: 0, num: '00', title: 'Welcome', titleItalic: '',
    subtitle: '06:00~06:05 ~ open warm, land the promise',
    duration: '5 min', speakers: ['BOTH'], panel: 'demo',
    audWhatTitle: '<em>This</em> is where you start.',
    audWhatBody: "<p>You signed up because you've been saying <em>\"I need to learn AI\"</em> for months. Tonight you actually do it ~ in a small group, with two operators who run businesses on this stack every day.</p><p>By the end, you'll have a <em>clear starting point</em>, not more overwhelm. That's the deal.</p>",
    audTakeaway: 'You came for a <em>starting point</em>. You leave with one.',
    beats: [
      {
        id: 'w0', title: 'Land the promise', speaker: 'BOTH', blocks: [
          { type: 'stage', text: 'Both on cam. Wait 30s for stragglers. Warm smile, slow tempo.' },
          { type: 'scripted', speaker: 'BOTH', text: "Hey everyone ~ welcome. I'm Abie, this is Meri. Before we do anything else ~ <em>thank you</em> for showing up. You could be doing a hundred other things tonight." },
          { type: 'scripted', speaker: 'BOTH', text: "Quick promise so you know what you're in for. You signed up because you've been saying <em>\"I need to learn AI\"</em> for months. Tonight, that ends." },
          { type: 'bullets', speaker: 'BOTH', items: [
            "By 8 PM, you'll <em>finally understand</em> what AI can actually do for your business",
            "You'll get hands-on with Claude in a small group setting ~ <em>no experience required</em>",
            "And you'll leave with a <em>clear starting point</em> ~ not 47 tabs and more overwhelm",
          ]},
          { type: 'scripted', speaker: 'BOTH', text: "That's the deal. <em>That's all we promised on the landing page.</em> We're going to deliver it." },
        ],
      },
      {
        id: 'w1', title: 'Housekeeping', speaker: 'BOTH', blocks: [
          { type: 'scripted', speaker: 'BOTH', text: "Two house rules and we go." },
          { type: 'bullets', speaker: 'BOTH', items: [
            "Drop your name + where you're joining from in the chat right now",
            "Meri is in the chat the whole event ~ ask anything, no question is too basic",
            "You'll see a workbook on screen ~ that's your live companion, use it",
            "<em>This is a workshop, not a webinar.</em> Be present ~ you'll get 10x more out of it",
          ]},
          { type: 'poll', text: "POLL ~ Drop a 1, 2, 3, or 4 in chat:\n1 = I run my own business\n2 = I work in a company but want my own thing\n3 = I freelance / side hustle\n4 = Just curious about AI" },
        ],
      },
    ],
  },

  // 01 ~ Origin stories
  {
    id: 1, num: '01', title: 'How we', titleItalic: 'got here',
    subtitle: '06:05~06:15 ~ Abie + Meri intros, why we don\'t gatekeep',
    duration: '10 min', speakers: ['BOTH'], panel: 'showcase',
    audWhatTitle: 'How we <em>got here</em>',
    audWhatBody: "<p>Two very different stories. One business. <em>You're learning from two operators</em> who actually run what they teach ~ not from coaches selling a course.</p><p>Abie's the engineer who came back to building. Meri's the marketer who burned out hiring people and figured out AI was the answer.</p>",
    audTakeaway: "Not coaches. <em>Operators.</em> What we teach tonight is what we run every day.",
    beats: [
      {
        id: 'o1', title: "Abie's story", speaker: 'ABIE', blocks: [
          { type: 'stage', text: 'Abie on cam. Slow down ~ this is the trust-building beat.' },
          { type: 'scripted', speaker: 'ABIE', text: "I'm from the Philippines, but right now I'm living in Madrid. <em>Weak passport. Strong plan.</em> That's become my whole thing." },
          { type: 'scripted', speaker: 'ABIE', text: "Tech background. Software engineer who moved into management ~ stopped coding for years. <em>And then Claude Code brought me back.</em> Last week I added a Privacy Policy page to our website in minutes ~ no real coding, just describing what I needed. Done. Deployed." },
          { type: 'scripted', speaker: 'ABIE', text: "What AI has done for our business in the last few months has been <em>genuinely insane.</em> Websites I didn't think I could build. Tools I didn't think I could create. <em>And we don't want to gatekeep any of it.</em> That's why you're here tonight." },
        ],
      },
      {
        id: 'o2', title: "Meri's story", speaker: 'MERI', blocks: [
          { type: 'stage', text: 'Meri on cam. Different energy ~ marketer who became operator.' },
          { type: 'scripted', speaker: 'MERI', text: "I come from the opposite side. <em>Marketing and business, not tech.</em> I built my agency from scratch ~ started as an SEO writer, then editors, developers, social managers. The whole thing." },
          { type: 'scripted', speaker: 'MERI', text: "And then I burned out. Managing people, personalities, deadlines ~ <em>it was exhausting.</em> When ChatGPT arrived, I was curious. <em>When Claude arrived, everything changed.</em>" },
          { type: 'scripted', speaker: 'MERI', text: "Now I run a leaner, smarter operation. <em>Less staff. More output. Better results.</em> Tonight, Abie and I are going to show you exactly how we do it." },
        ],
      },
      {
        id: 'o3', title: 'Talent Mucho ~ three pillars', speaker: 'BOTH', blocks: [
          { type: 'scripted', speaker: 'BOTH', text: "What we built together is <em>Talent Mucho</em>. Three pillars. <em>Educate. Build. Operate.</em>" },
          { type: 'bullets', speaker: 'BOTH', items: [
            '<em>Educate</em> ~ workshops, hands-on training, team adoption. Tonight is this pillar.',
            '<em>Build</em> ~ websites, automations, AI systems your business runs on',
            '<em>Operate</em> ~ AI-trained VAs and engineers placed inside your business',
            "Built by two women who run this stack every day, not coaches selling a course",
          ]},
          { type: 'scripted', speaker: 'BOTH', text: 'Tonight is the <em>Educate</em> pillar. <em>Free.</em> Because if you don\'t understand what AI can actually do, the rest doesn\'t matter.' },
          { type: 'workbook', text: 'WORKBOOK ~ Right now, on screen, write down: "What\'s the heaviest task in my work right now?" ~ we\'ll come back to this.' },
        ],
      },
    ],
  },

  // 02 ~ What is Claude
  {
    id: 2, num: '02', title: 'What is', titleItalic: 'Claude',
    subtitle: '06:15~06:27 ~ Claude vs ChatGPT, the mindset shift',
    duration: '15 min', speakers: ['MERI', 'ABIE'], panel: 'compare', panelData: 'chatgpt-vs-claude',
    audWhatTitle: 'What is <em>Claude</em> ~ and how is it different?',
    audWhatBody: "<p>Most of you opened ChatGPT first. So the real question isn't <em>\"what is Claude?\"</em> ~ it's <em>\"what's actually different, and why should I care?\"</em></p><p>We'll show you ~ live, side by side ~ what changes when you stop using AI like a search engine.</p>",
    audTakeaway: "Claude is not a search engine. It's a <em>thinking partner.</em> The skill is in the context you bring.",
    beats: [
      {
        id: 'c1', title: 'You came from ChatGPT', speaker: 'MERI', blocks: [
          { type: 'poll', text: 'POLL ~ Type in chat: 1 = ChatGPT user, 2 = Claude user, 3 = Both, 4 = Neither yet.' },
          { type: 'scripted', speaker: 'MERI', text: "Okay, looking at the poll ~ most of you use ChatGPT. <em>Which is perfect</em>, because that means you'll get the most out of tonight." },
          { type: 'scripted', speaker: 'MERI', text: "Claude is different from ChatGPT in a few important ways. <em>The first one nobody tells you about: tokens.</em>" },
          { type: 'bullets', speaker: 'MERI', items: [
            "Think of tokens like <em>fuel.</em> Every message you send uses some",
            "Claude has limits per session ~ when you hit them, you pause and come back later",
            "<em>Translation:</em> you can\'t spam Claude the way you spam ChatGPT. You have to be intentional.",
            "Claude is smarter and more careful ~ but it costs more to run, so you make each prompt count",
          ]},
        ],
      },
      {
        id: 'c2', title: "Claude asks YOU questions back", speaker: 'ABIE', blocks: [
          { type: 'scripted', speaker: 'ABIE', text: "The other big difference. <em>Claude asks YOU questions back.</em> ChatGPT will just give you an answer ~ generic, fast, and often wrong-toned." },
          { type: 'scripted', speaker: 'ABIE', text: "Claude says: <em>wait. What tone do you want? Who's the audience? What's the context?</em> That extra step? That's what makes Claude's outputs <em>so much more accurate.</em>" },
        ],
      },
      {
        id: 'c3', title: "Switching tools doesn't fix bad prompting", speaker: 'ABIE', blocks: [
          { type: 'scripted', speaker: 'ABIE', text: "Here's the real issue though. <em>Switching tools doesn't fix bad prompting.</em> Most people use Claude exactly like ChatGPT ~ a search bar. Watch what happens." },
          { type: 'stage', text: 'Compare panel auto-loaded. Hit RUN. Don\'t talk over the streaming output ~ let them read both sides.' },
        ],
      },
      {
        id: 'c4', title: 'The mindset shift', speaker: 'ABIE', blocks: [
          { type: 'scripted', speaker: 'ABIE', text: 'If you forget everything else tonight, take <em>this:</em>' },
          { type: 'bullets', speaker: 'ABIE', items: [
            "Claude is not a search engine ~ it's a <em>thinking partner</em>",
            'Stop typing "write me X" ~ start typing "I\'m a [role], here\'s the situation, here\'s what I need"',
            "The skill isn't in the tool. It's in <em>the context you bring.</em>",
            "<em>This is what we call vibe-prompting.</em> You bring the context, Claude does the work.",
          ]},
          { type: 'workbook', text: 'WORKBOOK ~ Write your own: "I\'m a [your role], my client/customer [name], here\'s what just happened: ____, I want Claude to: ____"' },
        ],
      },
    ],
  },

  // 03 ~ The Claudes + Models
  {
    id: 3, num: '03', title: 'The four', titleItalic: 'Claudes',
    subtitle: '06:27~06:40 ~ the four products + the three models',
    duration: '13 min', speakers: ['MERI', 'ABIE'], panel: 'products',
    audWhatTitle: 'The four <em>Claudes</em> + three models',
    audWhatBody: "<p>The confusing thing about Claude ~ there are <em>four products</em> and <em>three model sizes</em>. Same brain underneath. Different doors depending on what you're doing.</p><p>You only need Chat for your first month. We'll show you the others so you know what's out there ~ then we land on what matters.</p>",
    audTakeaway: 'Coming from ChatGPT? <em>Sonnet is your GPT-4o.</em> When in doubt, just use Sonnet.',
    beats: [
      {
        id: 'p1', title: 'Same brain, four doors', speaker: 'MERI', blocks: [
          { type: 'scripted', speaker: 'MERI', text: "Claude has <em>four main products.</em> Same AI underneath. Different doors depending on what you're trying to do." },
          { type: 'stage', text: 'Demo panel auto-shows the four products. Walk through them.' },
          { type: 'bullets', speaker: 'MERI', items: [
            "<em>Claude Chat</em> ~ the conversational interface, browser + desktop. Where you start.",
            "<em>Claude Cowork</em> ~ desktop only. Manages files, organizes folders, schedules tasks, controls your browser ~ from natural language",
            "<em>Claude Code</em> ~ build websites, apps, dashboards, tools just by describing what you want. <em>No coding required.</em>",
            "<em>Claude in Chrome</em> ~ a browsing agent. Does web tasks for you ~ research, lead gen, repetitive forms",
          ]},
        ],
      },
      {
        id: 'p2', title: 'Cowork ~ wake up to a sorted life', speaker: 'ABIE', blocks: [
          { type: 'scripted', speaker: 'ABIE', text: "<em>Cowork is wild.</em> Imagine waking up and your downloads folder is sorted by category. Blog images filed in the right folders. Invoices renamed and archived." },
          { type: 'scripted', speaker: 'ABIE', text: "<em>You didn't do that. Claude did it while you were sleeping.</em> That's Cowork." },
        ],
      },
      {
        id: 'p3', title: 'Code ~ Vibe Coding', speaker: 'ABIE', blocks: [
          { type: 'scripted', speaker: 'ABIE', text: "And Code ~ this is the one that changed everything for me. As an engineer who stopped coding for years, <em>Claude Code brought me back.</em>" },
          { type: 'scripted', speaker: 'ABIE', text: "Last week, I added a Privacy Policy page to our website in minutes. Just told Claude what I needed. Done. Deployed. <em>This is what we call Vibe Coding.</em>" },
          { type: 'bullets', speaker: 'ABIE', items: [
            "<em>You're the founder, the visionary.</em> Claude is the builder.",
            "You describe what you want ~ Claude makes it happen.",
            "<em>For Meri</em>, who's not a developer ~ Code lets her prototype, structure, hand to a dev. Saves weeks.",
            "<em>For me</em>, who used to code ~ it brought me back to building.",
          ]},
        ],
      },
      {
        id: 'p4', title: 'The three models', speaker: 'ABIE', blocks: [
          { type: 'scripted', speaker: 'ABIE', text: "Inside Claude you'll see three model names. <em>Think of them as different employees with different skill sets.</em>" },
          { type: 'bullets', speaker: 'ABIE', items: [
            "<em>Opus</em> ~ the genius. Most intelligent. Use for complex stuff: building skills, AI employees, strategy. <em>Sparingly.</em> Heavy on tokens.",
            "<em>Sonnet</em> ~ the workhorse. Daily driver. Coding, writing, organizing. Smart and efficient. <em>Use this 90% of the time.</em>",
            "<em>Haiku</em> ~ the speed demon. Fast lookups, short answers. Use it like ChatGPT for quick stuff.",
          ]},
          { type: 'scripted', speaker: 'MERI', text: "<em>My personal rule:</em> Opus only when I'm building something complex. Everything else Sonnet. Quick stuff Haiku. <em>Knowing when to use which is the whole game.</em>" },
        ],
      },
      {
        id: 'p5', title: 'Where to start tonight', speaker: 'ABIE', blocks: [
          { type: 'scripted', speaker: 'ABIE', text: "<em>Start with Chat. Use Sonnet.</em> Free tier exists. Pro is $20/mo. Don't skip ahead. 90% of your wins your first month live there." },
        ],
      },
    ],
  },

  // 04 ~ Live demos
  {
    id: 4, num: '04', title: 'Live', titleItalic: 'demos',
    subtitle: '06:40~07:05 ~ three real tasks, on screen',
    duration: '25 min', speakers: ['ABIE', 'MERI'], panel: 'demo', panelUrl: 'https://claude.ai/new',
    audWhatTitle: 'What we <em>demo</em> live',
    audWhatBody: "<p>This is the part you came for. <em>Real tasks. Live, on screen.</em> Tools we use to run our actual business every day ~ from inbox triage to proposal writing to invoice chasing.</p><p>We brought a <em>spin wheel</em> with seven options. Whoever's most engaged in the chat picks the spinner. <em>Whatever it lands on, we build live.</em></p>",
    audTakeaway: 'Your job tonight: <em>copy one of these prompts</em> and try it tomorrow.',
    beats: [
      {
        id: 'd1', title: 'Frame the demo block', speaker: 'ABIE', blocks: [
          { type: 'scripted', speaker: 'ABIE', text: "<em>Enough theory. Let's show you what this looks like in real life.</em> Three demos. Real tasks. On screen." },
          { type: 'bullets', speaker: 'ABIE', items: [
            "Demo 1 ~ Cowork organises my whole Downloads folder (Abie, ~6 min)",
            "Demo 2 ~ IG Carousel Generator skill ~ blog post → 7 slides (Abie, ~8 min)",
            "Demo 3 ~ Competitor Analysis tool ~ full intel report in minutes (Meri, ~8 min)",
          ]},
          { type: 'stage', text: "Meri pinned in chat: drops links + copies prompts as Abie types them." },
        ],
      },
      {
        id: 'd2', title: 'Demo 1 ~ File organization with Cowork', speaker: 'ABIE', blocks: [
          { type: 'stage', text: "Switch to Claude Cowork desktop app. Pre-recorded backup ready in case live fails." },
          { type: 'scripted', speaker: 'ABIE', text: "What you're watching is <em>Claude Cowork.</em> I gave it one instruction ~ <em>organise my Downloads folder by category.</em>" },
          { type: 'stage', text: 'Run the command live. Show files moving into Images, Documents, Spreadsheets, Invoices folders.' },
          { type: 'scripted', speaker: 'ABIE', text: "Look at that. Images, documents, spreadsheets ~ everything sorted automatically. <em>This used to take me an hour.</em> Now it takes 30 seconds. <em>That's Cowork.</em>" },
          { type: 'workbook', text: "WORKBOOK ~ What's one folder on your computer that's been a disaster for months? You're going to fix it tonight." },
        ],
      },
      {
        id: 'd3', title: 'Demo 2 ~ IG Carousel Generator skill', speaker: 'ABIE', blocks: [
          { type: 'scripted', speaker: 'ABIE', text: "Now watch <em>this.</em> This is one of our proprietary skills ~ the <em>IG Carousel Generator.</em>" },
          { type: 'scripted', speaker: 'ABIE', text: "I have a blog post. I want to turn it into a carousel for Instagram. <em>I paste the blog. Run the skill.</em>" },
          { type: 'stage', text: "Live demo: paste a real blog post into Claude. Run the skill. Show the 7 slides materialising." },
          { type: 'scripted', speaker: 'ABIE', text: "<em>Boom.</em> Seven slides. Properly formatted. Right structure, right tone. <em>I didn't write a single word of copy.</em>" },
          { type: 'bullets', speaker: 'ABIE', items: [
            "<em>Built without the API.</em> No code. No developer.",
            'A "skill" = a set of natural language instructions I gave Claude <em>once</em>',
            "Now it just works, every time, <em>forever</em>",
            "<em>This whole skill library lives inside our paid community.</em>",
          ]},
        ],
      },
      {
        id: 'd4', title: 'Demo 3 ~ Competitor Analysis (Meri)', speaker: 'MERI', blocks: [
          { type: 'stage', text: "Meri takes the cam. This is the demo for the business owners in the room." },
          { type: 'scripted', speaker: 'MERI', text: "This one is for the <em>business owners</em>. The Competitor Analysis tool. Also one of our proprietary skills." },
          { type: 'bullets', speaker: 'MERI', items: [
            "Step 1 ~ enter your <em>business type</em>",
            "Step 2 ~ describe your <em>audience</em>",
            "Step 3 ~ describe your <em>market</em>",
            "Step 4 ~ <em>Claude builds you a full competitive intelligence report</em>",
          ]},
          { type: 'stage', text: "Run live. Show: audience demographics, competitor strengths, market gaps, positioning strategy." },
          { type: 'scripted', speaker: 'MERI', text: "Audience demographics. Competitor strengths. Market gaps. Your positioning strategy. <em>All of it. In minutes.</em> A consultant would charge thousands for this." },
        ],
      },
      {
        id: 'd5', title: 'Pause + reset', speaker: 'BOTH', blocks: [
          { type: 'poll', text: 'POLL ~ "Which demo would save YOU the most hours? Type 1, 2, or 3."' },
          { type: 'stage', text: 'Meri reads top answers from chat. 90 second screen break. Stretch.' },
        ],
      },
    ],
  },

  // 05 ~ AI employees
  {
    id: 5, num: '05', title: 'AI', titleItalic: 'employees',
    subtitle: '07:05~07:20 ~ Meri\'s side ~ how we multiply VA work with AI',
    duration: '15 min', speakers: ['MERI'], panel: 'showcase',
    audWhatTitle: 'AI <em>employees</em> ~ the Operate pillar',
    audWhatBody: "<p>This is the <em>Operate</em> pillar at Talent Mucho. We don't replace VAs ~ <em>we multiply them.</em></p><p>You'll see how an \"AI employee\" gets built, what one does day-to-day, and how a VA + AI together does the work of three.</p>",
    audTakeaway: "<em>Don't replace people with AI.</em> Give them an AI co-worker that handles the boring 80%.",
    beats: [
      {
        id: 'e1', title: 'Meri leads ~ Operate', speaker: 'MERI', blocks: [
          { type: 'stage', text: 'Meri on cam. Showcase panel auto-shows her side.' },
          { type: 'scripted', speaker: 'MERI', text: "<em>This is the Operate pillar at Talent Mucho.</em> When clients hire us, this is what we put inside their business. Not just a VA. A VA <em>plus</em> an AI stack tuned to their actual work." },
        ],
      },
      {
        id: 'e2', title: 'What is an "AI employee"', speaker: 'MERI', blocks: [
          { type: 'scripted', speaker: 'MERI', text: "We call them <em>AI employees.</em> Each one is a Claude setup with a specific job, specific personality, specific instructions. <em>Not a chatbot. A trained role.</em>" },
          { type: 'bullets', speaker: 'MERI', items: [
            "<em>Inbox Triage AI</em> ~ sorts mail, drafts replies, flags only what needs a human",
            "<em>Lead Qualification AI</em> ~ scores leads, drafts the first reply",
            "<em>Content Review AI</em> ~ checks every post against the client's brand voice",
            "<em>Onboarding AI</em> ~ intake form to SOPs and Day-1 task list",
            "<em>Weekly Report AI</em> ~ pulls metrics, drafts the recap",
            "<em>FAQ Voice AI</em> ~ trained on the client's past replies, scales the voice demo",
          ]},
        ],
      },
      {
        id: 'e3', title: 'A day in the life', speaker: 'MERI', blocks: [
          { type: 'scripted', speaker: 'MERI', text: "<em>The VA doesn't disappear.</em> She becomes the editor, the decision-maker, the relationship person. The AI employee handles the volume." },
          { type: 'bullets', speaker: 'MERI', items: [
            "Morning ~ AI triages overnight emails. VA reviews + sends in 30 min instead of 3 hours",
            "Midday ~ AI flags 2 client decisions that need a human. VA handles those",
            "Afternoon ~ AI drafts the weekly report. VA edits + adds the human context",
            "<em>Result ~ same VA, 3x the client capacity.</em> Or same clients, half the hours.",
          ]},
          { type: 'workbook', text: 'WORKBOOK ~ "The most annoying repetitive thing in my week is: ____."' },
        ],
      },
    ],
  },

  // 06 ~ Behind the scenes
  {
    id: 6, num: '06', title: 'Behind the', titleItalic: 'scenes',
    subtitle: "07:20~07:35 ~ live tour of Abie's vibe-coded stack",
    duration: '15 min', speakers: ['ABIE', 'MERI'], panel: 'showcase',
    audWhatTitle: 'Behind the <em>scenes</em>',
    audWhatBody: "<p>Quick tour. Abie's <em>actual</em> operating system. The CLI, the dashboard, the auto-deploys. <em>Real screens, no slides.</em></p><p>This is the proof segment. Everything we taught tonight is also <em>how we run our days.</em></p>",
    audTakeaway: "<em>Don't try to build it all at once.</em> Pick the most annoying weekly task. Build that one thing first.",
    beats: [
      {
        id: 'bts1', title: "Why we're showing you this", speaker: 'BOTH', blocks: [
          { type: 'stage', text: 'Both on cam. Tone shifts ~ proof segment.' },
          { type: 'scripted', speaker: 'BOTH', text: "Quick one before Q&A. <em>This isn't theory for us.</em> Everything we taught tonight, we run ourselves. We want to show you what that actually looks like behind the curtain." },
        ],
      },
      {
        id: 'bts2', title: "Abie's CLI runs the day", speaker: 'ABIE', blocks: [
          { type: 'scripted', speaker: 'ABIE', text: "My side. <em>Most days I don't open Gmail.</em> I open my terminal." },
          { type: 'stage', text: 'Switch to actual terminal screen-share. Run the email co-pilot CLI live.' },
          { type: 'bullets', speaker: 'ABIE', items: [
            'CLI checks inbox, summarises, drafts replies in <em>my voice</em>',
            'Website edits ~ I describe the change, Claude Code writes + commits + deploys ~ <em>that\'s vibe coding</em>',
            'No Gmail tab. No Notion. <em>Everything I need is one command away.</em>',
          ]},
        ],
      },
      {
        id: 'bts3', title: 'The personal dashboard', speaker: 'ABIE', blocks: [
          { type: 'scripted', speaker: 'ABIE', text: "Inside my own website I have a dashboard that runs my whole life. <em>I used to use Notion, Coda, Asana.</em> Now it's all custom-built." },
          { type: 'stage', text: 'Tour the dashboard ~ ADHD Command Centre, Carousel Studio, UGC Pipeline, Sales Pipeline, OKRs.' },
          { type: 'scripted', speaker: 'ABIE', text: "My honest take: <em>everyone should have a system that's yours.</em> Not rented from someone else's tool. Claude Code makes that accessible to anyone now ~ even people who don't code." },
          { type: 'scripted', speaker: 'ABIE', text: "<em>This is what AI has actually done for us.</em> Websites I didn't think I could build. Tools I didn't think I could create. <em>All done.</em>" },
        ],
      },
      {
        id: 'bts4', title: 'The point ~ start small', speaker: 'BOTH', blocks: [
          { type: 'scripted', speaker: 'BOTH', text: "<em>We didn't build any of this in a weekend.</em> One tool at a time. Each one solved one annoying problem. Six months in, the compound is real." },
          { type: 'scripted', speaker: 'BOTH', text: "Remember the answer you wrote down earlier ~ <em>the most annoying repetitive thing in your week?</em> That's what you build first. Not the dashboard. Not the AI employee. <em>One tool, one annoying problem.</em>" },
        ],
      },
    ],
  },

  // 07 ~ Q&A + next step
  {
    id: 7, num: '07', title: 'Q&A +', titleItalic: 'next step',
    subtitle: '07:38~08:00 ~ pre-screened Q&A then the close',
    duration: '22 min', speakers: ['BOTH'], panel: 'qa',
    audWhatTitle: 'Open <em>Q&amp;A</em>',
    audWhatBody: "<p>Meri's been collecting your questions all hour. We're going to take the top ones and answer them with real demos ~ not generic advice.</p><p>After Q&A: a 4-minute close on what to do next.</p>",
    audTakeaway: "You got your <em>starting point</em>. The next step is whether you <em>actually take it.</em>",
    beats: [
      {
        id: 'q1', title: 'Frame Q&A', speaker: 'BOTH', blocks: [
          { type: 'stage', text: 'Both back on cam. Meri reads from her queue.' },
          { type: 'scripted', speaker: 'BOTH', text: "<em>This is the part you came for.</em> Meri has the top 5~6 questions. We answer with real demos. 3 min max each." },
        ],
      },
      {
        id: 'q2', title: 'Run Q&A', speaker: 'BOTH', blocks: [
          { type: 'stage', text: 'Work the queue. Meri reads, Abie demos. Watch the clock ~ 15 min absolute max.' },
        ],
      },
      {
        id: 'q3', title: 'Recap the promise', speaker: 'BOTH', blocks: [
          { type: 'stage', text: "Q&A is wrapping. Tone tightens ~ this is the most important 6 minutes of the night." },
          { type: 'scripted', speaker: 'BOTH', text: "Quick recap before we close. <em>What did we promise you tonight?</em>" },
          { type: 'bullets', speaker: 'BOTH', items: [
            "You'd <em>finally understand</em> what AI can do for your business ~ ✓ done",
            "You'd get hands-on with Claude in a small group ~ ✓ done",
            "You'd walk away with a <em>clear starting point</em>, not more overwhelm ~ ✓ done",
          ]},
          { type: 'scripted', speaker: 'BOTH', text: "<em>That was free.</em> No catch. We delivered what we promised on the landing page. <em>You owe us nothing.</em>" },
        ],
      },
      {
        id: 'q4', title: 'The honest reframe', speaker: 'ABIE', blocks: [
          { type: 'scripted', speaker: 'ABIE', text: "But here's what's also true. Tonight you saw <em>what's possible.</em> The dashboard. The AI employees. The CLI that runs my day. The proposals." },
          { type: 'scripted', speaker: 'ABIE', text: "<em>What we didn't show you</em> ~ because 2 hours is 2 hours ~ is <em>how we built any of it.</em>" },
          { type: 'scripted', speaker: 'ABIE', text: "You got the destination tonight. <em>You didn't get the map.</em>" },
          { type: 'stage', text: "Pause 2 seconds. Let it land." },
        ],
      },
      {
        id: 'q5', title: 'Stack the value ~ €47 VIP', speaker: 'MERI', blocks: [
          { type: 'scripted', speaker: 'MERI', text: "So here's what we built for the people who want the map. We call it <em>VIP</em>. <em>One time. €47.</em> Here's exactly what's inside:" },
          { type: 'bullets', speaker: 'MERI', items: [
            "<em>Full replay + transcript</em> ~ 30-day access · rewatch any demo, copy any prompt (€97 value)",
            "<em>The Claude Vault</em> ~ Talent Mucho's <em>premium proprietary skill library</em> · private dashboard setups + Claude skills (€297 value)",
            "<em>VIP-only group follow-up</em> ~ 45 min private session with Abie & Meri, small group",
            "<em>30-day Premium Skool access</em> ~ closed mentorship, weekly Vibe Coding. €49/mo after if you stay, cancel anytime (€49 value)",
            "<em>Early access to the upcoming Bootcamp</em> ~ before it opens to the public",
          ]},
          { type: 'scripted', speaker: 'MERI', text: "<em>Total real value: over €700.</em> Tonight only ~ €47." },
          { type: 'scripted', speaker: 'ABIE', text: "Real talk on what these skills are worth. At our old dev agency we charged <em>€10,000 to €20,000 to build prototypes</em> for clients. Tonight you're getting the skills <em>and</em> the knowledge to build your own ~ for a fraction of one of those." },
        ],
      },
      {
        id: 'q6', title: 'Why this price, this once', speaker: 'MERI', blocks: [
          { type: 'scripted', speaker: 'MERI', text: "<em>I want to be honest about the price.</em> €47 isn't because we don't value our work. It's because <em>we want you in the room early.</em>" },
          { type: 'bullets', speaker: 'MERI', items: [
            "After tonight, premium Skool goes back to <em>€97/month</em>",
            "We're building this community in front of you ~ early members shape what we build",
            "You can spend <em>6 months</em> figuring this out alone the way we did ~",
            "Or you can spend <em>6 weeks inside Skool</em> with two operators in the room",
          ]},
          { type: 'scripted', speaker: 'MERI', text: "<em>€47 isn't a fee. It's compressed time.</em>" },
        ],
      },
      {
        id: 'q7', title: 'Risk reversal', speaker: 'ABIE', blocks: [
          { type: 'scripted', speaker: 'ABIE', text: "And because €47 still feels like a yes-or-no decision for some of you ~ <em>here's our promise.</em>" },
          { type: 'scripted', speaker: 'ABIE', text: "Try the recording. Open the Vault. Sit in one Skool call. If in the first <em>14 days</em> you genuinely feel like you didn't get more than €47 of value ~ email us. <em>Full refund.</em> No form. No \"sorry to see you go\" survey. Just gone." },
          { type: 'scripted', speaker: 'ABIE', text: "<em>The only thing you risk is showing up.</em>" },
        ],
      },
      {
        id: 'q8', title: 'Three doors out', speaker: 'BOTH', blocks: [
          { type: 'scripted', speaker: 'BOTH', text: "Three doors out tonight. They map to how we work at Talent Mucho ~ <em>Educate. Build. Operate.</em>" },
          { type: 'bullets', speaker: 'BOTH', items: [
            "<em>Door 1 ~ Free.</em> Close this tab. Open Claude tonight. Try one demo. Join the free Skool tier. <em>This is enough for some of you ~ and that's totally fine.</em>",
            "<em>Door 2 ~ €47 VIP.</em> Replay + transcript, Claude Vault, VIP follow-up call with us, 30 days of Premium Skool, early access to the Bootcamp. <em>This is the one most of you should take ~ especially if you're serious about not being back in this same spot in 6 months.</em>",
            "<em>Door 3 ~ Custom.</em> Want us to build your AI stack and place a trained VA inside your business? Book a free call at talentmucho.com/booking. We only take 4 of these a quarter.",
          ]},
        ],
      },
      {
        id: 'q8b', title: 'Bootcamp teaser', speaker: 'MERI', blocks: [
          { type: 'scripted', speaker: 'MERI', text: "<em>One more thing</em> ~ for the people who really want to go deep. We're running an <em>intensive bootcamp</em> in 2 weeks. Hands-on. Small groups. <em>Not one-size-fits-all.</em>" },
          { type: 'bullets', speaker: 'MERI', items: [
            "If you're a <em>VA</em> ~ we focus on VA workflows + AI employees",
            "If you're a <em>founder</em> ~ we focus on your business systems + dashboards",
            "If you're <em>building something</em> ~ we vibe-code it with you live",
          ]},
          { type: 'scripted', speaker: 'MERI', text: "<em>VIPs get 50% off the upcoming Bootcamp</em> ~ €147 down to €74. Limited spots ~ small on purpose, because we want to actually mentor you, not teach at you." },
          { type: 'scripted', speaker: 'ABIE', text: "Drop <em>BOOTCAMP</em> in the chat if you want details. We'll DM you tomorrow." },
        ],
      },
      {
        id: 'q9', title: 'The starting point', speaker: 'BOTH', blocks: [
          { type: 'scripted', speaker: 'BOTH', text: "Last thing. Then we let you go." },
          { type: 'scripted', speaker: 'BOTH', text: "When you signed up, the landing page said <em>\"This is where you start.\"</em>" },
          { type: 'scripted', speaker: 'BOTH', text: "Tonight you got a starting point. <em>The only thing left is whether you actually take it.</em>" },
          { type: 'scripted', speaker: 'BOTH', text: "The difference between tonight being <em>interesting</em> and tonight <em>changing your business</em> is what you do in the next 24 hours. Don't close this tab and go scroll." },
          { type: 'bullets', speaker: 'BOTH', items: [
            "Open Claude tonight. <em>One thing.</em> Try one demo from tonight",
            "If you want the map ~ the VIP link is in the chat",
            "If you want us inside your business ~ talentmucho.com/booking",
          ]},
          { type: 'scripted', speaker: 'BOTH', text: "Thank you for two hours of your life. We don't take that lightly. <em>Go build something.</em> Goodnight." },
          { type: 'stage', text: 'Wave off slowly. Don\'t cut the recording yet ~ stay 5 min for stragglers + hot leads. Meri pins VIP link one more time.' },
        ],
      },
    ],
  },
];
