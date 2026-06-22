export type WikiTopic = {
  title: string;
  slug: string;
  description: string;
};

export const wikiTopics: WikiTopic[] = [
  {
    title: "خورشید در چارت تولد",
    slug: "sun-sign",
    description:
      "خورشید معمولاً نمادی از هویت، انگیزه اصلی و شیوه ابراز انرژی فردی در تفسیر سنتی است.",
  },
  {
    title: "ماه در چارت تولد",
    slug: "moon-sign",
    description:
      "ماه می‌تواند به نیازهای احساسی، دنیای درونی و واکنش‌های ناخودآگاه اشاره کند.",
  },
  {
    title: "رایزینگ یا طالع",
    slug: "rising-sign",
    description:
      "رایزینگ نمادی از شروع ارتباط با جهان، برداشت اولیه دیگران و لحن ورود به تجربه‌هاست.",
  },
  {
    title: "خانه‌های نجومی",
    slug: "astrology-houses",
    description:
      "خانه‌ها در چارت تولد زمینه‌های مختلف زندگی مثل رابطه، کار، خانواده و مسیر شخصی را نشان می‌دهند.",
  },
  {
    title: "جنبه‌ها یا Aspects",
    slug: "aspects",
    description:
      "جنبه‌ها رابطه زاویه‌ای بین نقاط چارت هستند و در تفسیر نمادین، کیفیت تعامل انرژی‌ها را توضیح می‌دهند.",
  },
];
