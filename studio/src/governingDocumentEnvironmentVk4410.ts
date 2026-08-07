export const VK4410_ENVIRONMENT_DECISION = {
  documentType: 'authority_decision',
  title: 'Tillstånd för enskild avloppsanläggning – Vemdalens Kyrkby 44:10',
  issuer: 'Berg och Härjedalens miljö- och byggnämnd',
  reference: 'm-2026-617 · 2026-06-04',
  sourceFilename: 'Enskilt avlopp - Tillstånd - Infiltration_Håkan_Tunell_197204157916_074c605d.pdf',
  sourceMimeType: 'application/pdf',
  items: [
    { code: 'V-01', sectionCode: 'V', sectionTitle: 'Villkor vid anläggandet', itemType: 'condition', description: 'Anläggningen ska placeras och utföras enligt ansökan, inkomna kompletteringar och tillverkarens anvisningar om inte beslutets villkor anger annat.', evidenceRequired: 'Utförande och relevant dokumentation' },
    { code: 'V-02', sectionCode: 'V', sectionTitle: 'Villkor vid anläggandet', itemType: 'condition', description: 'Installationen ska utföras av dokumenterat sakkunnig person på ett fackmannamässigt sätt.', evidenceRequired: 'Uppgift om utförare / entreprenörsrapport' },
    { code: 'V-03', sectionCode: 'V', sectionTitle: 'Villkor vid anläggandet', itemType: 'measurement', description: 'Avståndet mellan infiltrationsnivån och grundvattenytan ska normalt vara minst 1 m och får aldrig understiga 0,5 m.', evidenceRequired: 'Mått eller kommentar om varför posten inte kan verifieras' },
    { code: 'V-04', sectionCode: 'V', sectionTitle: 'Villkor vid anläggandet', itemType: 'control', description: 'Avloppsanläggningen ska vara tät fram till infiltrationen och infiltrationen ska hållas fri från växtlighet med grova rötter.', evidenceRequired: 'Kontroll / dokumentation' },
    { code: 'V-05', sectionCode: 'V', sectionTitle: 'Villkor vid anläggandet', itemType: 'condition', description: 'Dag- och dräneringsvatten samt andra angivna främmande vatten får inte ledas till avloppsanläggningen.', evidenceRequired: 'Kontroll av anslutningar' },
    { code: 'V-06', sectionCode: 'V', sectionTitle: 'Villkor vid anläggandet', itemType: 'documentation', description: 'Snarast efter färdigställandet ska ifylld entreprenörsrapport och fotodokumentation skickas till miljö- och byggnämnden.', evidenceRequired: 'Entreprenörsrapport + fotodokumentation' },

    { code: 'D-01', sectionCode: 'D', sectionTitle: 'Skötsel och drift', itemType: 'information', description: 'Anläggningen ska kontrolleras och skötas enligt ansökan, kompletteringar och tillverkarens anvisningar.', evidenceRequired: 'Drift- och skötselinformation' },
    { code: 'D-02', sectionCode: 'D', sectionTitle: 'Skötsel och drift', itemType: 'condition', description: 'Anläggningen ska slamtömmas enligt tillverkarens anvisningar och beslutets villkor.', evidenceRequired: 'Slamtömningsrutiner' },
    { code: 'D-03', sectionCode: 'D', sectionTitle: 'Skötsel och drift', itemType: 'condition', description: 'Anläggningen ska vara åtkomlig för slamtömning och får inte täckas över eller göras oåtkomlig.', evidenceRequired: 'Översikt / åtkomlighet' },
    { code: 'D-04', sectionCode: 'D', sectionTitle: 'Skötsel och drift', itemType: 'information', description: 'Tillståndet med villkor ska finnas tillgängligt hos sökanden och överlämnas till ny ägare vid överlåtelse.', evidenceRequired: 'Dokument bevarat' },
    { code: 'D-05', sectionCode: 'D', sectionTitle: 'Skötsel och drift', itemType: 'information', description: 'Större ingrepp, materialbyte eller andra åtgärder av betydelse för funktionen kan kräva anmälan till miljö- och byggnämnden.', evidenceRequired: 'Kommentar vid framtida ändring' },

    { code: 'F-01', sectionCode: 'F', sectionTitle: 'Fotodokumentation enligt bilaga 2', itemType: 'documentation', description: 'Ta en bild i varje installerad brunn, exempelvis slambrunn, fördelningsbrunn och eventuell uppsamlingsbrunn.', evidenceRequired: 'Foto i varje installerad brunn' },
    { code: 'F-02', sectionCode: 'F', sectionTitle: 'Fotodokumentation enligt bilaga 2', itemType: 'documentation', description: 'Ta bild på infiltration eller markbädd när gropen är grävd och tom så att markmaterial längs väggar och botten syns.', evidenceRequired: 'Foto av tom grop och markmaterial' },
    { code: 'F-03', sectionCode: 'F', sectionTitle: 'Fotodokumentation enligt bilaga 2', itemType: 'documentation', description: 'Ta ytterligare en bild per utförd del av infiltrationen eller markbädden så att varje lager av sand, grus och spridningsledningar syns.', evidenceRequired: 'Foto av varje lager / kommentar om befintlig infiltration' },
    { code: 'F-04', sectionCode: 'F', sectionTitle: 'Fotodokumentation enligt bilaga 2', itemType: 'documentation', description: 'Ta bild på ledningarna innan de läggs igen.', evidenceRequired: 'Foto av ledningar före återfyllning' },
    { code: 'F-05', sectionCode: 'F', sectionTitle: 'Fotodokumentation enligt bilaga 2', itemType: 'documentation', description: 'Ta en översiktsbild som visar brunnens placering, infiltrationens eller markbäddens placering och huset.', evidenceRequired: 'Översiktsfoto' },
    { code: 'F-06', sectionCode: 'F', sectionTitle: 'Fotodokumentation enligt bilaga 2', itemType: 'administration', description: 'Skicka bilderna tillsammans med entreprenörsrapporten till miljö- och byggnämnden så snart avloppet är anlagt.', evidenceRequired: 'Insänd fotodokumentation + entreprenörsrapport' }
  ]
} as const;
