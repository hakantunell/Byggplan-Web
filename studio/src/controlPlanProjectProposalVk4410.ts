import type { ReviewedControlPlanPoint } from './controlPlanVk4410';

export const VK4410_PROJECT_CONTROL_PLAN = {
  title: 'Kontrollplan – Nybyggnad av fritidshus, Vemdalens Kyrkby 44:10',
  sourceFilename: 'Kontrollplan_VemdalensKyrkby44_10_Fritidshus.pdf',
  sourceMimeType: 'application/pdf',
  points: [
    { code:'1.1', description:'Utsättning av byggnad', method:'Mätning på plats mot situationsplan och bygglovsbeslut', responsibleRole:'BH/KA', evidenceRequired:'Egen utsättning enligt situationsplan', categoryCode:'1', categoryTitle:'Grundutförande', pointType:'measurement' as any },
    { code:'1.2', description:'Grundläggning / torpargrund', method:'Visuell kontroll och mätning mot ritningar och marknivåer', responsibleRole:'BH/KA', evidenceRequired:'Visuell kontroll', categoryCode:'1', categoryTitle:'Grundutförande', pointType:'control' },
    { code:'1.3', description:'Fuktskydd under byggtid', method:'Visuell kontroll av täckning av virke, syllar och grund under byggskedet', responsibleRole:'BH', evidenceRequired:'Egen fuktskyddsplan', categoryCode:'1', categoryTitle:'Grundutförande', pointType:'control' },

    { code:'2.1', description:'Bärande stomme (timmerstomme)', method:'Visuell kontroll av mått, knutar och infästningar', responsibleRole:'BH/KA', evidenceRequired:'Konstruktionshandlingar', categoryCode:'2', categoryTitle:'Stomme', pointType:'control' },
    { code:'2.2', description:'Skarvar och dragstag (gängstänger)', method:'Kontroll av borrning, montering och åtdragning', responsibleRole:'BH', evidenceRequired:'Konstruktionshandlingar', categoryCode:'2', categoryTitle:'Stomme', pointType:'control' },
    { code:'2.3', description:'Bjälklag / golvbärning', method:'Visuell kontroll', responsibleRole:'BH/KA', evidenceRequired:'Konstruktionshandlingar; KA vid stomresning', categoryCode:'2', categoryTitle:'Stomme', pointType:'control' },
    { code:'2.4', description:'Takstolar / takkonstruktion (rundtimmer + takåsar)', method:'Visuell kontroll', responsibleRole:'BH/KA', evidenceRequired:'Konstruktionshandlingar; KA slutkontroll', categoryCode:'2', categoryTitle:'Stomme', pointType:'control' },

    { code:'3.1', description:'Tak- och väggtäckning (plåttak, panel)', method:'Visuell kontroll mot ritningar och produktanvisning', responsibleRole:'BH', evidenceRequired:'Ritningar och produktanvisning', categoryCode:'3', categoryTitle:'Stomkomplettering / utformning', pointType:'control' },
    { code:'3.2', description:'Fönster och dörrar', method:'Visuell kontroll av mått, infästning och tätning', responsibleRole:'BH', evidenceRequired:'Ritningar', categoryCode:'3', categoryTitle:'Stomkomplettering / utformning', pointType:'control' },

    { code:'4.1', description:'Ventilation (självdrag)', method:'Visuell kontroll av till- och frånluftsventiler, eventuellt rökprov', responsibleRole:'BH/KA', evidenceRequired:'Ritning / BBR avsnitt 6', categoryCode:'4', categoryTitle:'Ventilation', pointType:'control' },

    { code:'5.1', description:'Elinstallation', method:'Egenkontroll som behörig installatör', responsibleRole:'Behörig elinstallatör', evidenceRequired:'Intyg; elinstallationsregler SS 436 40 00', categoryCode:'5', categoryTitle:'Värme / Sanitet', pointType:'document' },
    { code:'5.2', description:'Värmeisolering, täthet', method:'Kontroll av isolering, ångspärr och genomföringar', responsibleRole:'BH/KA', evidenceRequired:'Ritningar och teknisk beskrivning', categoryCode:'5', categoryTitle:'Värme / Sanitet', pointType:'control' },
    { code:'5.3', description:'Brandskydd', method:'Kontroll av brandvarnare, utrymningsvägar och ytskikt', responsibleRole:'BH', evidenceRequired:'BBR avsnitt 5', categoryCode:'5', categoryTitle:'Värme / Sanitet', pointType:'control' },
    { code:'5.4', description:'Installation av eldstad (vedkamin)', method:'Egenkontroll av skyddsavstånd och sotarintyg efter installation', responsibleRole:'BH/KA', evidenceRequired:'Brandskyddsdokumentation och sotarintyg', categoryCode:'5', categoryTitle:'Värme / Sanitet', pointType:'control' },

    { code:'6.1', description:'Vatten och avlopp', method:'Egenkontroll, eventuellt intyg från entreprenör samt foto före återfyllning', responsibleRole:'BH/KA', evidenceRequired:'VA-beslut från kommunen; foto före återfyllning', categoryCode:'6', categoryTitle:'VA / Mark', pointType:'control' },

    { code:'7.1', description:'Färdigställande', method:'Genomgång av hela byggnaden', responsibleRole:'BH/KA', evidenceRequired:'Bygglovsbeslut och ritningar; gemensam slutkontroll', categoryCode:'7', categoryTitle:'Övrigt', pointType:'control' },
    { code:'7.2', description:'Radonbedömning', method:'Kontroll mot SGU:s markradonkarta', responsibleRole:'BH', evidenceRequired:'Ingen åtgärd planerad', categoryCode:'7', categoryTitle:'Övrigt', pointType:'control' },

    { code:'S-01', description:'Ifylld och signerad kontrollplan lämnas in för slutbesked', method:'Handling inför slutbesked', responsibleRole:'BH', evidenceRequired:'Signerad kontrollplan', categoryCode:'S', categoryTitle:'Handlingar för slutbesked', pointType:'document' },
    { code:'S-02', description:'Egenkontroller och intyg för el, VA och brandskydd lämnas in för slutbesked', method:'Handling inför slutbesked', responsibleRole:'BH', evidenceRequired:'Egenkontroller/intyg', categoryCode:'S', categoryTitle:'Handlingar för slutbesked', pointType:'document' },
    { code:'S-03', description:'Fotografier för grund, VA-anslutning och dränering lämnas in vid behov', method:'Handling inför slutbesked', responsibleRole:'BH', evidenceRequired:'Fotodokumentation', categoryCode:'S', categoryTitle:'Handlingar för slutbesked', pointType:'document' },
    { code:'S-04', description:'Intyg från miljöenheten för avlopp lämnas in vid behov', method:'Handling inför slutbesked', responsibleRole:'BH', evidenceRequired:'Eventuellt intyg från miljöenheten', categoryCode:'S', categoryTitle:'Handlingar för slutbesked', pointType:'document' }
  ] satisfies ReviewedControlPlanPoint[]
};
