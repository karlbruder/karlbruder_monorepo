const policies = { rules: { document: null }, cancellation_policy: { document: null } };

export const acceptanceEvidence = {
  "acceptance_content": {
    "pt": {
      policies,
      "declarations": {
        "accepts_rules": "Regulamento de teste",
        "accepts_data_processing": "Tratamento de dados de teste",
        "declares_truthful_information": "Veracidade de teste",
        "acknowledges_inherent_risks": "Ciência dos riscos de teste",
        "declares_has_required_equipment": "Equipamento de teste",
        "declares_physically_fit": "Aptidão física de teste",
        "accepts_cancellation_policy": "Política de cancelamento de teste"
      }
    },
    "en": {
      policies,
      "declarations": {
        "accepts_rules": "Sample rules declaration",
        "accepts_data_processing": "Sample data processing declaration",
        "declares_truthful_information": "Sample truthfulness declaration",
        "acknowledges_inherent_risks": "Sample risk declaration",
        "declares_has_required_equipment": "Sample equipment declaration",
        "declares_physically_fit": "Sample physical fitness declaration",
        "accepts_cancellation_policy": "Sample cancellation declaration"
      }
    }
  },
  "acceptance_tokens": {
    "pt": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    "en": "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
  }
};
