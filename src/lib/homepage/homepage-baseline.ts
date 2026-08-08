import heroImage from '@images/hero-image.avif';
import featureImage from '@images/features-image.avif';
import construction from '@images/construction-image.avif';
import tools from '@images/automated-tools.avif';
import dashboard from '@images/dashboard-image.avif';
import type { HomepageViewModel } from '../cms/homepage-models';

/**
 * Theme Baseline Fallback — exact copy of the original Acme theme content.
 * Used when CMS data is unavailable or fields are empty.
 * All text, numbers, CTAs, and list counts are preserved exactly as in the original theme.
 */
export const HOMEPAGE_BASELINE: HomepageViewModel = {
  announcement: {
    enabled: true,
    buttonLabel: 'Explore Acme on GitHub',
    url: 'https://github.com',
  },
  hero: {
    titleBefore: 'Equip Your Projects with ',
    highlightText: 'Acme',
    titleAfter: '',
    subTitle:
      'Top-quality hardware tools and expert construction services for every project need.',
    primaryButtonLabel: 'Start Exploring',
    primaryButtonUrl: '/products',
    secondaryButtonLabel: 'Contact Sales Team',
    secondaryButtonUrl: '/contact',
    withReview: true,
    ratingText: '4.8 / 5',
    starCount: 4,
    reviewsText: 'From Over 12.8k Reviews',
    imageAlt: 'Stack of Acme product boxes containing assorted hardware tools',
    image: {
      url: String(heroImage),
      alt: 'Stack of Acme product boxes containing assorted hardware tools',
    },
    avatars: [
      {
        url: 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=facearea&facepad=2&w=300&h=300&q=80',
        alt: '',
      },
      {
        url: 'https://images.unsplash.com/photo-1531927557220-a9e23c1e4794?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=facearea&facepad=2&w=300&h=300&q=80',
        alt: '',
      },
      {
        url: 'https://images.unsplash.com/photo-1541101767792-f9b2b1c4f127?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&&auto=format&fit=facearea&facepad=3&w=300&h=300&q=80',
        alt: '',
      },
      {
        url: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=facearea&facepad=2&w=300&h=300&q=80',
        alt: '',
      },
    ],
  },
  clients: {
    title: 'Trusted by Industry Leaders',
    subTitle: 'Experience the reliability chosen by industry giants.',
    partners: [
      { name: 'first', url: '#', alt: '' },
      { name: 'Second', url: '#', alt: '' },
      { name: 'Third', url: '#', alt: '' },
      { name: 'Fourth', url: '#', alt: '' },
    ],
  },
  featuresGeneral: {
    title: 'Meeting Industry Demands',
    subTitle:
      "At Acme, we tackle the unique challenges encountered in the hardware and construction sectors. From cutting-edge tools to expert services, we're dedicated to helping you overcome obstacles and achieve your goals.",
    imageAlt: 'Acme products in floating boxes',
    image: {
      url: String(featureImage),
      alt: 'Acme products in floating boxes',
    },
    items: [
      {
        heading: 'Dedicated Teams',
        content:
          'Benefit from our committed teams who ensure your success is personal. Count on expert guidance and exceptional results throughout your project journey.',
        svg: 'groups',
      },
      {
        heading: 'Simplicity and Affordability',
        content:
          "Find easy-to-use, affordable solutions with Acme's line of tools and equipment. Our products make procurement simple and keep projects within budget.",
        svg: 'verified',
      },
      {
        heading: 'Comprehensive Documentation',
        content:
          "Integrate with ease using Acme's exhaustive guides and libraries. Achieve seamless product adoption with our full suite of documentation designed for your success.",
        svg: 'books',
      },
      {
        heading: 'User-Centric Design',
        content:
          "Experience the difference with Acme's user-focused design – where functionality meets practicality for an enhanced work experience.",
        svg: 'frame',
      },
    ],
  },
  featuresNavs: {
    titleBefore: 'Customize ',
    highlightText: 'Acme',
    titleAfter:
      "'s offerings to perfectly suit your hardware and construction needs.",
    tabs: [
      {
        heading: 'Cutting-Edge Tools',
        content:
          "Empower your projects with Acme's cutting-edge tools. Experience enhanced efficiency in construction management with our sophisticated automated solutions.",
        iconKey: 'tools',
        imageAlt: 'Yellow and black heavy equipment on brown grass field',
        image: {
          url: String(tools),
          alt: 'Yellow and black heavy equipment on brown grass field',
        },
      },
      {
        heading: 'Intuitive Dashboards',
        content:
          "Navigate with ease using Acme's intuitive dashboards. Set up and oversee your projects seamlessly, with user-friendly interfaces designed for quick and effective workflow management.",
        iconKey: 'dashboard',
        imageAlt:
          'A screenshot or graphic representation of the intuitive dashboard',
        image: {
          url: String(dashboard),
          alt: 'A screenshot or graphic representation of the intuitive dashboard',
        },
      },
      {
        heading: 'Robust Features',
        content:
          "Minimize complexity, maximize productivity. Acme's robust features are engineered to streamline your construction process, delivering results that stand out for their excellence.",
        iconKey: 'house',
        imageAlt: 'Gray metal building frame near tower crane during daytime',
        image: {
          url: String(construction),
          alt: 'Gray metal building frame near tower crane during daytime',
        },
      },
    ],
  },
  testimonials: {
    title: 'Fast-Track Your Projects',
    subTitle:
      'At Acme, we ensure a swift start with instant account setup. Experience the speed of construction redefined.',
    items: [
      {
        content:
          'Acme dramatically boosted our project efficiency. Setup was instant, and their rapid response times are phenomenal. Truly a game-changer in hardware and construction support!',
        author: 'Samantha Ruiz',
        role: 'Chief Operating Officer | ConstructIt Inc.',
        avatar: {
          url: 'https://images.unsplash.com/photo-1593104547489-5cfb3839a3b5?q=80&w=1453&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D8&auto=format&fit=facearea&facepad=2&w=320&h=320&q=80',
          alt: '',
        },
      },
    ],
    statistics: [
      {
        count: '70k+',
        description:
          'customers equipped – from DIY to major construction firms',
      },
      {
        count: '35%',
        description:
          'uptick in project efficiency with Acme tools and services',
      },
      {
        count: '15.3%',
        description:
          'reduction in maintenance costs reported by long-term clients',
      },
      {
        count: '2x',
        description: 'quicker assembly using innovative fastening solutions',
      },
    ],
  },
  pricing: {
    title: 'Simple, Transparent Pricing',
    subTitle: "Boost efficiency with Acme's clear, value-driven plans.",
    badge: 'Best value',
    thirdOption: 'Enterprise Solutions?',
    btnText: 'Get a Custom Quote',
    starterKit: {
      name: 'Starter Kit',
      description: 'Best option for DIY projects',
      price: '49',
      cents: '.00',
      billingFrequency: 'USD / monthly',
      features: [
        'Key hardware tools',
        'Access to guides & tutorials',
        'Standard support',
      ],
      purchaseBtnTitle: 'Get the Starter Kit',
      purchaseLink: '#',
    },
    professionalToolbox: {
      name: 'Professional Toolbox',
      description: 'Best for large scale uses',
      price: '89',
      cents: '.00',
      billingFrequency: 'USD / monthly',
      features: [
        'Premium tool selection',
        'Priority support',
        'Exclusive content & deals',
        'Bulk order discounts',
      ],
      purchaseBtnTitle: 'Get the Professional Toolbox',
      purchaseLink: '#',
    },
  },
  faq: {
    titleLine1: 'Frequently',
    titleLine2: 'asked questions',
    items: [
      {
        question: 'What types of tools are included in the Starter Kit?',
        answer:
          "The Starter Kit features essential hand and power tools for diverse DIY projects, including hammers, drills, screwdrivers, and a variety of fasteners. It's a curated selection to help beginners and experienced DIYers alike tackle most home improvement tasks.",
      },
      {
        question:
          'Can I upgrade from the Starter Kit to the Professional Toolbox?',
        answer:
          'Absolutely! You can upgrade to the Professional Toolbox at any time to access a wider range of high-quality tools, enjoy priority customer support, and receive exclusive content. Contact our support team for a seamless transition.',
      },
      {
        question:
          'What discounts are available for bulk orders through the Professional Toolbox plan?',
        answer:
          "Professional Toolbox members are entitled to exclusive discounts on bulk orders, the percentage of which may vary depending on the order volume. Get in touch with us to discuss your needs, and we'll provide a tailored discount structure.",
      },
      {
        question: 'What kind of customer support can I expect?',
        answer:
          "All our customers receive dedicated email support. With the Starter Kit, you'll receive our standard support, while the Professional Toolbox plan upgrades you to priority support, meaning faster response times and specialized assistance.",
      },
      {
        question: 'How current are the online resources and tutorials?',
        answer:
          'We regularly update our online resources and tutorials to reflect the latest trends in DIY and construction, as well as introductions to new tools and techniques. Our material aims to be comprehensive and user-friendly for all skill levels.',
      },
      {
        question:
          'Does Acme offer services for large-scale construction projects?',
        answer:
          'Yes, our Enterprise Solutions are designed for larger companies requiring comprehensive services. We provide consultation, planning, and supply of high-grade tools and materials, as well as staffing solutions for substantial construction needs. Contact us for a customized quote.',
      },
    ],
  },
  bottomCta: {
    title: "Let's Build Together",
    subTitle:
      'Acme is an open-source template, meticulously crafted with Astro, Tailwind CSS, and Preline UI frameworks.',
    buttonLabel: 'Explore Acme on GitHub',
    url: 'https://github.com',
  },
  seo: {
    title: 'Acme — Premium Hardware Tools & Construction Services',
    description:
      'Acme delivers top-quality hardware tools and expert construction services. From DIY projects to enterprise-scale builds, we equip your projects with everything you need.',
  },
};
