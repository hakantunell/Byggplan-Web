export type ReviewedControlPlanPoint = {
  code: string;
  description: string;
  method: string;
  responsibleRole: string;
  evidenceRequired: string;
  categoryCode: string;
  categoryTitle: string;
  pointType: 'control' | 'visit' | 'document' | 'administration' | 'not_applicable';
  applicable?: boolean;
};

export const VK4410_CONTROL_PLAN = {
  title: 'Kontrollplan enligt PBL för KA – Vemdalens Kyrkby 44:10',
  sourceFilename: 'Kontrollplan KA VK 44.10 enl Tekniska egenskapskrav inför Tekniskt samråd.pdf',
  sourceMimeType: 'application/pdf',
  points: [
    { code: 'A-01', description: 'Utstakning av byggnaden', method: 'PBL 10 kap. 26 §', responsibleRole: 'KA', evidenceRequired: 'Mätintyg', categoryCode: 'A', categoryTitle: 'Allmänna PBL/PBF', pointType: 'document' },
    { code: 'A-02', description: 'Kontrollmätning/lägeskontroll av byggnadens placering', method: 'Kommunens krav', responsibleRole: 'KA', evidenceRequired: 'Mätintyg', categoryCode: 'A', categoryTitle: 'Allmänna PBL/PBF', pointType: 'document' },
    { code: 'A-03', description: 'Besök vid grundbotten inför gjutning', method: 'Överenskommelse KA/BH', responsibleRole: 'KA', evidenceRequired: 'Allmän okulärsyn', categoryCode: 'A', categoryTitle: 'Allmänna PBL/PBF', pointType: 'visit' },
    { code: 'A-04', description: 'Besök när stommen är rest', method: 'Överenskommelse KA/BH', responsibleRole: 'KA', evidenceRequired: 'Allmän okulärsyn', categoryCode: 'A', categoryTitle: 'Allmänna PBL/PBF', pointType: 'visit' },
    { code: 'A-05', description: 'Besök under pågående invändiga arbeten', method: 'Överenskommelse KA/BH', responsibleRole: 'KA', evidenceRequired: 'Allmän okulärsyn', categoryCode: 'A', categoryTitle: 'Allmänna PBL/PBF', pointType: 'visit' },
    { code: 'A-06', description: 'Byggnadsnämndens arbetsplatsbesök vid tätt hus innan allt är igenbyggt', method: 'PBL 10 kap. 27 §', responsibleRole: 'KA', evidenceRequired: 'Enligt beslut vid tekniskt samråd', categoryCode: 'A', categoryTitle: 'Allmänna PBL/PBF', pointType: 'visit' },
    { code: 'A-07', description: 'Besök vid slutsamråd', method: 'PBL 10 kap. 11 och 30–32 §§', responsibleRole: 'KA', evidenceRequired: 'Enligt beslut vid tekniskt samråd', categoryCode: 'A', categoryTitle: 'Allmänna PBL/PBF', pointType: 'visit' },
    { code: 'A-08', description: 'Överensstämmelse med bygglov', method: 'PBL 10 kap. 5 §', responsibleRole: 'KA', evidenceRequired: 'Byggherreintyg', categoryCode: 'A', categoryTitle: 'Allmänna PBL/PBF', pointType: 'document' },
    { code: 'A-09', description: 'Arbetsmiljöplan upprättad', method: 'BBR 2:3; AFS 1999:3', responsibleRole: 'BH', evidenceRequired: 'Se totalentreprenörens egenkontroll', categoryCode: 'A', categoryTitle: 'Allmänna PBL/PBF', pointType: 'administration' },
    { code: 'A-10', description: 'BAS-P utsedd av byggherren', method: 'AML 6 §; AFS 1999:3', responsibleRole: 'BH', evidenceRequired: 'Se arbetsmiljöplan', categoryCode: 'A', categoryTitle: 'Allmänna PBL/PBF', pointType: 'administration' },
    { code: 'A-11', description: 'BAS-U utsedd av byggherren', method: 'AML 6 §; AFS 1999:3', responsibleRole: 'BH', evidenceRequired: 'Se arbetsmiljöplan', categoryCode: 'A', categoryTitle: 'Allmänna PBL/PBF', pointType: 'administration' },
    { code: 'A-12', description: 'Startmöte med genomgång', method: 'BH + KA:s krav', responsibleRole: 'KA', evidenceRequired: 'Protokoll', categoryCode: 'A', categoryTitle: 'Allmänna PBL/PBF', pointType: 'administration' },

    { code: '1-01', description: 'Geoteknisk utredning utförd', method: 'EKS, EN 1997', responsibleRole: 'KA', evidenceRequired: 'Geoteknisk utredning', categoryCode: '1', categoryTitle: 'Bärförmåga, stadga och beständighet', pointType: 'document' },
    { code: '1-02', description: 'Radonklass enligt kommunens uppgifter', method: 'BBR 6:23', responsibleRole: 'KA', evidenceRequired: 'Se geoteknisk utredning', categoryCode: '1', categoryTitle: 'Bärförmåga, stadga och beständighet', pointType: 'control' },
    { code: '1-03', description: 'Geotekniskt utlåtande beaktat i projekteringen', method: 'Egenkontroll', responsibleRole: 'EK', evidenceRequired: 'Se projektörernas egenkontroller', categoryCode: '1', categoryTitle: 'Bärförmåga, stadga och beständighet', pointType: 'control' },
    { code: '1-04', description: 'Totalentreprenörens egenkontroll enligt upprättat förslag', method: 'Egenkontroll', responsibleRole: 'EK', evidenceRequired: 'Signerad kontrollplan', categoryCode: '1', categoryTitle: 'Bärförmåga, stadga och beständighet', pointType: 'document' },

    { code: '2-01', description: 'Intyg från sotare för rökkanaler och taksäkerhet', method: 'LSO 3 kap. 4 §; BBR 5:4256, 5:5332 och 8:24', responsibleRole: 'KA', evidenceRequired: 'Intyg från sotare', categoryCode: '2', categoryTitle: 'Säkerhet i händelse av brand', pointType: 'document' },
    { code: '2-02', description: 'Brandskyddsbeskrivning upprättad', method: 'BBR 5:12', responsibleRole: 'KA', evidenceRequired: 'Preliminärt utlåtande', categoryCode: '2', categoryTitle: 'Säkerhet i händelse av brand', pointType: 'document' },
    { code: '2-03', description: 'Brandskyddsdokumentation upprättad', method: 'BBR 5:12', responsibleRole: 'KA', evidenceRequired: 'Slutlig brandskyddsdokumentation', categoryCode: '2', categoryTitle: 'Säkerhet i händelse av brand', pointType: 'document' },
    { code: '2-04', description: 'Brandskyddsbeskrivning beaktad i projekteringen', method: 'Egenkontroll', responsibleRole: 'EK', evidenceRequired: 'Se projektörernas egenkontroller', categoryCode: '2', categoryTitle: 'Säkerhet i händelse av brand', pointType: 'control' },

    { code: '3-01', description: 'Installationer för dagvatten', method: 'BBR 6:642', responsibleRole: 'EK', evidenceRequired: 'Se totalentreprenörens egenkontroll', categoryCode: '3', categoryTitle: 'Skydd med hänsyn till hygien, hälsa och miljön', pointType: 'control' },
    { code: '3-02', description: 'Behörighetskontroll enligt Byggkeramikrådet eller redovisning av utförd metod', method: 'Egenkontroll', responsibleRole: 'EK', evidenceRequired: 'Intyg', categoryCode: '3', categoryTitle: 'Skydd med hänsyn till hygien, hälsa och miljön', pointType: 'document' },
    { code: '3-03', description: 'Fuktsäkerhetsprojektering beaktad i projekteringen', method: 'Egenkontroll', responsibleRole: 'EK', evidenceRequired: 'Se projektörernas egenkontroller', categoryCode: '3', categoryTitle: 'Skydd med hänsyn till hygien, hälsa och miljön', pointType: 'control' },
    { code: '3-04', description: 'Provtryckningsprotokoll VA', method: 'Egenkontroll', responsibleRole: 'EK', evidenceRequired: 'Protokoll', categoryCode: '3', categoryTitle: 'Skydd med hänsyn till hygien, hälsa och miljön', pointType: 'document' },

    { code: '4-01', description: 'Elinstallationsföretaget registrerat hos Elsäkerhetsverket', method: 'ELSÄK-FS 2017:3', responsibleRole: 'KA', evidenceRequired: 'Bevis från elentreprenör', categoryCode: '4', categoryTitle: 'Säkerhet vid användning', pointType: 'document' },
    { code: '4-02', description: 'Isolationsprovning utförd', method: 'ELSÄK-FS 2017:2', responsibleRole: 'EK', evidenceRequired: 'Bevis från elentreprenör', categoryCode: '4', categoryTitle: 'Säkerhet vid användning', pointType: 'document' },
    { code: '4-03', description: 'Jordfelsbrytare', method: 'ELSÄK-FS 2017:2', responsibleRole: 'EK', evidenceRequired: 'Bevis från elentreprenör', categoryCode: '4', categoryTitle: 'Säkerhet vid användning', pointType: 'control' },

    { code: '5-01', description: 'Skydd mot buller – ej aktuellt', method: '', responsibleRole: 'EK', evidenceRequired: '', categoryCode: '5', categoryTitle: 'Skydd mot buller', pointType: 'not_applicable', applicable: false },
    { code: '6-01', description: 'Energihushållning och värmeisolering – ej aktuellt för fritidshus', method: '', responsibleRole: '', evidenceRequired: '', categoryCode: '6', categoryTitle: 'Energihushållning och värmeisolering', pointType: 'not_applicable', applicable: false },
    { code: '7-01', description: 'Se arkitektens egenkontroll', method: 'BBR kap. 3', responsibleRole: 'EK', evidenceRequired: 'Arkitektens egenkontroll', categoryCode: '7', categoryTitle: 'Lämplighet för det avsedda ändamålet', pointType: 'document' },
    { code: '8-01', description: 'Se arkitektens egenkontroll av tillgänglighet och användbarhet', method: 'BBR 3:1', responsibleRole: 'EK', evidenceRequired: 'Arkitektens egenkontroll', categoryCode: '8', categoryTitle: 'Tillgänglighet och användbarhet', pointType: 'document' },
    { code: '9-01', description: 'VA-inspektion före övertäckning', method: 'Kommunens krav', responsibleRole: 'EK/KA', evidenceRequired: 'Intyg', categoryCode: '9', categoryTitle: 'Hushållning med vatten och avfall', pointType: 'visit' },
    { code: '9-02', description: 'Relationshandlingar för LOD och utvändigt VA', method: 'Kommunens krav', responsibleRole: 'EK', evidenceRequired: 'Ritningar', categoryCode: '9', categoryTitle: 'Hushållning med vatten och avfall', pointType: 'document' },
    { code: '10-01', description: 'Förberedelse för bredbandsanslutning', method: 'PBL 8 kap. 4 §', responsibleRole: 'EK', evidenceRequired: 'Se projektörernas egenkontroll', categoryCode: '10', categoryTitle: 'Bredbandsanslutning', pointType: 'control' },
    { code: '11-01', description: 'Laddning av elfordon – ej aktuellt', method: 'PBL 8 kap. 4 §', responsibleRole: 'EK', evidenceRequired: '', categoryCode: '11', categoryTitle: 'Laddning av elfordon', pointType: 'not_applicable', applicable: false }
  ] satisfies ReviewedControlPlanPoint[]
};
