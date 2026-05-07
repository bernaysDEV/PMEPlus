// Infographic Design Templates Configuration

export interface InfographicShape {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
  prompt: string;
  icon: string;
}

export interface InfographicStyle {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
  prompt: string;
  color: string;
}

// Infographic Shapes (التصميمات)
const infographicShapesArray: InfographicShape[] = [
  {
    id: 'basic-info',
    name: 'إنفوجرافيك معلومات أساسية',
    nameEn: 'Basic Information',
    description: 'ستايل بسيط جدًا، مربعات واضحة، تقسيم مباشر، يناسب ملخصات البيانات أو التقارير',
    descriptionEn: 'Simple style with clear boxes, direct layout, suitable for data summaries',
    prompt: 'Arabic minimalist infographic design, vertical layout (9:16), unified Arabic font, no ornaments, clean boxes, soft neutral background, clear headers, small icons, structured sections',
    icon: '📊'
  },
  {
    id: 'four-sections',
    name: 'إنفوجرافيك مقسم إلى 4 محاور',
    nameEn: '4-Section Layout',
    description: 'تقسيم رباعي واضح لأربع محاور رئيسية — مثالي للمقارنات أو عرض جوانب متعددة',
    descriptionEn: 'Clear quadruple division for comparisons or multiple aspects',
    prompt: 'Arabic infographic design with four equal vertical or horizontal sections, clean layout, 9:16 ratio, unified Arabic font, flat icons, soft gradients, modern minimal style',
    icon: '⊞'
  },
  {
    id: 'timeline',
    name: 'إنفوجرافيك خط زمني',
    nameEn: 'Timeline',
    description: 'مناسب لعرض تطور، مراحل، أو خطوات عملية',
    descriptionEn: 'Suitable for showing evolution, phases, or process steps',
    prompt: 'Arabic vertical timeline infographic, 9:16 layout, minimal clean lines, unified Arabic font, step-by-step structure, circle markers, soft color palette, no ornaments',
    icon: '📈'
  },
  {
    id: 'comparison',
    name: 'إنفوجرافيك مقارنة بين جهتين',
    nameEn: 'Two-Way Comparison',
    description: 'مثالي لعقد مقارنة واضحة بين خيارين أو جهتين أو سوقين',
    descriptionEn: 'Ideal for comparing two options, entities, or markets',
    prompt: 'Arabic comparison infographic split into two columns, balanced clean layout, minimal flat icons, unified Arabic font, neutral colors, clear labels, 9:16 vertical format',
    icon: '⚖️'
  },
  {
    id: 'radial',
    name: 'إنفوجرافيك دائرة مركزية',
    nameEn: 'Central Radial',
    description: 'يناسب موضوع يكون له عنصر رئيسي في المنتصف وينتشر منه 6 نقاط',
    descriptionEn: 'Suitable for a central topic with 6 surrounding points',
    prompt: 'Arabic radial infographic with central circle and six surrounding elements, clean minimal design, unified Arabic font, flat line icons, soft shadows, vertical 9:16 format, no ornaments',
    icon: '🎯'
  },
  {
    id: 'pyramid',
    name: 'إنفوجرافيك هرمي/تدرّجي',
    nameEn: 'Pyramid/Hierarchical',
    description: 'للعناصر التي تعتمد على طبقات أو مستويات',
    descriptionEn: 'For elements based on layers or levels',
    prompt: 'Arabic pyramid/stacked infographic, vertical 9:16 layout, minimal shapes, unified Arabic font, subtle gradients, clear layers, modern business style, no decorative elements',
    icon: '▲'
  },
  {
    id: 'process',
    name: 'إنفوجرافيك خطوات عملية',
    nameEn: 'Process Steps',
    description: 'مثالي لعرض 3–6 خطوات بطريقة انسيابية',
    descriptionEn: 'Ideal for showing 3-6 steps in a flowing manner',
    prompt: 'Arabic process infographic with flowing arrows and numbered steps, 9:16 vertical layout, unified Arabic font, minimal color palette, flat iconography, clean professional structure',
    icon: '➜'
  },
  {
    id: 'statistics',
    name: 'إنفوجرافيك بيانات وأرقام',
    nameEn: 'Statistics & Data',
    description: 'مناسب للإحصائيات – النسب – المؤشرات – الرسوم الخطية البسيطة',
    descriptionEn: 'Suitable for statistics, percentages, indicators, simple charts',
    prompt: 'Arabic data-driven infographic with percentage charts, number highlights, clean grids, unified Arabic font, minimal style, 9:16 vertical layout, no ornaments',
    icon: '📉'
  },
  {
    id: 'roadmap',
    name: 'إنفوجرافيك خريطة طريق',
    nameEn: 'Roadmap',
    description: 'ممتاز لخطط مستقبلية أو مراحل تطور مشروع',
    descriptionEn: 'Excellent for future plans or project development phases',
    prompt: 'Arabic roadmap infographic, curved path with milestones, 9:16 minimal vertical layout, unified Arabic font, flat icons, soft color gradients, clean modern business aesthetic',
    icon: '🗺️'
  },
  {
    id: 'main-details',
    name: 'إنفوجرافيك عناصر رئيسية + تفاصيل',
    nameEn: 'Main Elements + Details',
    description: 'عنصر رئيسي كبير، وتحته نقاط مفصلة',
    descriptionEn: 'Large main element with detailed sub-points',
    prompt: 'Arabic infographic with main header block and multiple detailed sub-points, 9:16 vertical format, unified Arabic font, simple separators, minimal icons, clean aesthetic, no ornamental graphics',
    icon: '📋'
  }
];

// Convert array to object indexed by id
export const infographicShapes: Record<string, InfographicShape> = infographicShapesArray.reduce(
  (acc, shape) => ({ ...acc, [shape.id]: shape }),
  {}
);

// Infographic Styles (الأنواع)
const infographicStylesArray: InfographicStyle[] = [
  {
    id: 'minimal-flat',
    name: 'إنفوجرافيك بسيط فلات',
    nameEn: 'Minimal Flat',
    description: 'بدون زخارف، ألوان هادئة، أيقونات خطية',
    descriptionEn: 'No ornaments, soft colors, line icons',
    prompt: 'Arabic minimalist flat infographic, 9:16 vertical layout, unified Arabic font, flat icons, soft colors, clean grid layout, no ornaments',
    color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
  },
  {
    id: 'corporate-clean',
    name: 'تصميم شركات احترافي',
    nameEn: 'Corporate Clean',
    description: 'ألوان رسمية، خطوط واضحة، مساحات بيضاء',
    descriptionEn: 'Formal colors, clear lines, white spaces',
    prompt: 'Arabic corporate infographic, professional layout, 9:16 vertical, unified Arabic font, blue/gray palette, clean sections, sharp icons, business aesthetic',
    color: 'linear-gradient(135deg, #2196F3 0%, #21CBF3 100%)'
  },
  {
    id: 'premium-gradient',
    name: 'إنفوجرافيك فاخر',
    nameEn: 'Premium Gradient',
    description: 'تدرجات ناعمة، لمسات راقية',
    descriptionEn: 'Soft gradients, refined touches',
    prompt: 'Arabic premium infographic with soft gradients, 9:16 vertical, elegant Arabic font, subtle shadows, refined icons, high-end color palette, modern luxurious style',
    color: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)'
  },
  {
    id: 'soft-2.5d',
    name: 'تصميم شبه ثلاثي أبعاد',
    nameEn: '2.5D Soft Illustrations',
    description: 'عناصر ظليّة، عمق خفيف، واقعية بسيطة',
    descriptionEn: 'Shadow elements, light depth, simple realism',
    prompt: 'Arabic infographic with 2.5D soft illustrations, semi-realistic elements, 9:16 vertical layout, clean typography, soft shadows, minimal depth, unified Arabic font',
    color: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
  },
  {
    id: 'line-icon',
    name: 'أيقونات خطية فقط',
    nameEn: 'Line-Icon Style',
    description: 'أنيق، خفيف جداً، يعتمد على الخطوط',
    descriptionEn: 'Elegant, very light, based on lines',
    prompt: 'Arabic line-icon infographic, 9:16 vertical, thin outlined icons, monochromatic palette, unified Arabic font, minimal separators, ultra-clean layout',
    color: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)'
  },
  {
    id: 'bold-blocks',
    name: 'تصميم جريء بمربعات',
    nameEn: 'Bold Blocks',
    description: 'مربعات بارزة، عناوين قوية، ألوان صريحة',
    descriptionEn: 'Prominent blocks, strong headers, explicit colors',
    prompt: 'Arabic bold-blocks infographic, 9:16 vertical, strong headers, clear color blocks, unified Arabic font, bold contrasts, clean modern UI look',
    color: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)'
  },
  {
    id: 'monochrome',
    name: 'أحادي اللون',
    nameEn: 'Monochrome',
    description: 'أسود وأبيض / لون واحد — رسمي، نظيف جدًا',
    descriptionEn: 'Black & white / one color — formal, very clean',
    prompt: 'Arabic monochrome infographic, one-color palette, 9:16 vertical, unified Arabic font, minimal shapes, clean contrast, strict grid layout',
    color: 'linear-gradient(135deg, #434343 0%, #000000 100%)'
  },
  {
    id: 'cards',
    name: 'بطاقات معلومات',
    nameEn: 'Infographic Cards',
    description: 'كل قسم داخل كارد منفصل',
    descriptionEn: 'Each section in a separate card',
    prompt: 'Arabic card-based infographic, 9:16 layout, soft card shadows, unified Arabic font, minimal spacing, icons per card, clean business style',
    color: 'linear-gradient(135deg, #3498db 0%, #8e44ad 100%)'
  },
  {
    id: 'illustration-mix',
    name: 'مزيج رسومي لطيف',
    nameEn: 'Illustration Mix',
    description: 'رسومات بسيطة مع فلات',
    descriptionEn: 'Simple illustrations with flat design',
    prompt: 'Arabic infographic with flat illustrations, modern minimal style, soft colors, unified Arabic font, balanced visuals, 9:16 vertical',
    color: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)'
  },
  {
    id: 'neutral-white',
    name: 'إنفوجرافيك أبيض نقي',
    nameEn: 'Neutral White',
    description: 'خلفية بيضاء، عناصر دقيقة، مظهر نظيف جداً',
    descriptionEn: 'White background, delicate elements, very clean look',
    prompt: 'Arabic white-minimal infographic, pure white background, thin lines, unified Arabic font, simple icons, 9:16 vertical, ultra-clean aesthetic',
    color: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)'
  }
];

// Convert array to object indexed by id
export const infographicStyles: Record<string, InfographicStyle> = infographicStylesArray.reduce(
  (acc, style) => ({ ...acc, [style.id]: style }),
  {}
);

// Helper function to combine shape and style prompts
export function combineInfographicPrompts(
  shapeId: string,
  styleId: string,
  content: string,
  language: 'ar' | 'en' = 'ar'
): string {
  const shape = infographicShapesArray.find(s => s.id === shapeId);
  const style = infographicStylesArray.find(s => s.id === styleId);
  
  if (!shape || !style) {
    throw new Error('Invalid shape or style ID');
  }
  
  // Extract key elements from both prompts
  const shapeElements = shape.prompt.toLowerCase();
  const styleElements = style.prompt.toLowerCase();
  
  // Combine prompts intelligently
  let combinedPrompt = '';
  
  // Start with the shape structure
  if (shapeElements.includes('timeline')) {
    combinedPrompt = 'Arabic timeline infographic';
  } else if (shapeElements.includes('comparison')) {
    combinedPrompt = 'Arabic comparison infographic';
  } else if (shapeElements.includes('radial')) {
    combinedPrompt = 'Arabic radial infographic';
  } else if (shapeElements.includes('pyramid')) {
    combinedPrompt = 'Arabic pyramid infographic';
  } else if (shapeElements.includes('process')) {
    combinedPrompt = 'Arabic process infographic';
  } else if (shapeElements.includes('roadmap')) {
    combinedPrompt = 'Arabic roadmap infographic';
  } else if (shapeElements.includes('four equal')) {
    combinedPrompt = 'Arabic four-section infographic';
  } else if (shapeElements.includes('data-driven')) {
    combinedPrompt = 'Arabic statistics infographic';
  } else {
    combinedPrompt = 'Arabic infographic';
  }
  
  // Add style characteristics
  if (styleElements.includes('flat')) {
    combinedPrompt += ', flat minimal design';
  } else if (styleElements.includes('corporate')) {
    combinedPrompt += ', corporate professional style';
  } else if (styleElements.includes('gradient')) {
    combinedPrompt += ', premium soft gradients';
  } else if (styleElements.includes('2.5d')) {
    combinedPrompt += ', 2.5D soft illustrations';
  } else if (styleElements.includes('line-icon')) {
    combinedPrompt += ', thin line icons only';
  } else if (styleElements.includes('bold')) {
    combinedPrompt += ', bold blocks and strong headers';
  } else if (styleElements.includes('monochrome')) {
    combinedPrompt += ', monochrome single-color palette';
  } else if (styleElements.includes('card')) {
    combinedPrompt += ', card-based sections';
  } else if (styleElements.includes('white-minimal')) {
    combinedPrompt += ', pure white minimal background';
  }
  
  // Add common elements
  combinedPrompt += ', 9:16 vertical format, unified Arabic font';
  
  // Add specific shape features
  if (shapeElements.includes('timeline')) {
    combinedPrompt += ', step-by-step structure with circle markers';
  } else if (shapeElements.includes('two columns')) {
    combinedPrompt += ', split into two balanced columns';
  } else if (shapeElements.includes('central circle')) {
    combinedPrompt += ', central element with 6 surrounding points';
  } else if (shapeElements.includes('flowing arrows')) {
    combinedPrompt += ', flowing arrows and numbered steps';
  } else if (shapeElements.includes('percentage charts')) {
    combinedPrompt += ', with data charts and number highlights';
  } else if (shapeElements.includes('curved path')) {
    combinedPrompt += ', curved path with milestones';
  } else if (shapeElements.includes('four equal')) {
    combinedPrompt += ', divided into 4 equal sections';
  }
  
  // Add style-specific colors
  if (styleElements.includes('blue/gray')) {
    combinedPrompt += ', blue and gray color scheme';
  } else if (styleElements.includes('soft colors')) {
    combinedPrompt += ', soft pastel colors';
  } else if (styleElements.includes('high-end color')) {
    combinedPrompt += ', luxury color palette';
  }
  
  // Final touches
  combinedPrompt += ', clean modern aesthetic, professional quality';
  
  // Add the content
  if (language === 'ar') {
    combinedPrompt += `. Add the following Arabic content: ${content}`;
  } else if (language === 'en') {
    combinedPrompt = combinedPrompt.replace(/Arabic/g, 'English');
    combinedPrompt += `. Add the following English content: ${content}`;
  }
  
  return combinedPrompt;
}

// Get display names for UI
export function getShapeDisplayName(shapeId: string, language: 'ar' | 'en' = 'ar'): string {
  const shape = infographicShapesArray.find(s => s.id === shapeId);
  return shape ? (language === 'ar' ? shape.name : shape.nameEn) : '';
}

export function getStyleDisplayName(styleId: string, language: 'ar' | 'en' = 'ar'): string {
  const style = infographicStylesArray.find(s => s.id === styleId);
  return style ? (language === 'ar' ? style.name : style.nameEn) : '';
}