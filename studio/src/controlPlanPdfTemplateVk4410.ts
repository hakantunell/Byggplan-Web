export const VK4410_CONTROL_PLAN_PDF_TEMPLATE = {
  company: {
    name: 'Tell Consulting AB',
    contactName: 'Örjan Kjellström',
    phone: '070-594 48 58',
    email: 'orjan@tellconsulting.se',
    addressLines: ['Västiåsgatan 9', '846 71 Vemdalen']
  },
  documentTitle: 'Kontrollplan enligt PBL för KA',
  documentSubtitle: 'Tekniska egenskapskrav, Förslag inför tekniskt samråd',
  caseOfficer: 'ÖKJ',
  documentDate: '2026-06-08',
  technicalConsultationDate: '2026-06-10',
  buildingDescription: 'Nybyggnad av fritidshus',
  orientationDescription: 'Byggnaden utförs i ett plan och källardel med en bärande timmerstomme, grundlagd med ventilerad torpargrund. Fasaden utgörs av timmerstommen. Taktäckning av plåt.',
  applicableStandards: 'BBR 29, EKS 12, PBL',
  fireDesign: 'Förenklad dimensionering tillämpas',
  occupancyClass: 'Vk 3',
  designers: [
    ['Arkitekt', 'Byggherre', 'Egenkontroll'],
    ['Konstruktör', 'Byggherre', 'Egenkontroll'],
    ['VVS (Värme, Sanitet Ventilation)', 'Byggherre', 'Egenkontroll'],
    ['El', '', 'Egenkontroll']
  ],
  contractors: [
    ['Markentreprenör', 'Byggherre I egenregi', 'Egenkontroll'],
    ['Byggentreprenör', 'Byggherre I egenregi', 'Egenkontroll'],
    ['VVS-entreprenör', 'Ej utsedd', 'Egenkontroll'],
    ['El-entreprenör', 'Ej utsedd', 'Egenkontroll']
  ],
  abbreviations: [
    ['BBR', 'Boverkets Byggregler'],
    ['PBL', 'Plan- och bygglagen'],
    ['EKS', 'Europeiska konstruktionsstandarder'],
    ['ÖK', 'Överenskommelse'],
    ['BH', 'Byggherre'],
    ['KA', 'Kontrollansvarig'],
    ['LSO', 'Lag om skydd mot olyckor'],
    ['BED', 'Boverkets föreskrifter om energideklarationer'],
    ['OVK', 'Boverkets föreskrifter om funktionskontroll'],
    ['PBF', 'Plan- och byggförordningen'],
    ['AML', 'Arbetsmiljölagen'],
    ['TE', 'Totalentreprenör'],
    ['EK', 'Egenkontroller']
  ]
} as const;
