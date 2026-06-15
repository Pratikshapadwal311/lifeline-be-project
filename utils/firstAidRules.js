/**
 * First Aid Rules Utility
 * Generates first aid instructions based on patient's medical data
 * Uses keyword matching on free-text medical fields
 */

const CONDITIONS = [
  {
    name: 'Diabetes',
    condKey: 'diabetes',
    keywords: ['diabet', 'insulin', 'metformin', 'glucophage', 'blood sugar', 'hypoglyc', 'hyperglycemia', 'type 1', 'type 2'],
    icon: '🩸',
    color: 'orange',
    instructions: [
      'Check if the person is conscious and breathing',
      'DO NOT give food, water, or sugar unless they are conscious and can swallow',
      'If conscious and able to swallow → give sugar (juice, candy, glucose)',
      'If unconscious → DO NOT put anything in mouth',
      'Place in recovery position (on their side)',
      'Tell paramedics: patient is diabetic'
    ],
    warning: 'Patient is DIABETIC — blood sugar may be very low or very high'
  },
  {
    name: 'Heart Condition',
    condKey: 'heart',
    keywords: ['heart', 'cardiac', 'angina', 'pacemaker', 'bypass', 'amlodipine', 'atenolol', 'cardio', 'heart attack', 'heart failure', 'arrhythmia', 'nitroglycerin', 'ecg'],
    icon: '❤️',
    color: 'red',
    instructions: [
      'Call ambulance IMMEDIATELY — this is life threatening',
      'Keep the person calm and still — no movement',
      'Loosen tight clothing around neck and chest',
      'If unconscious and not breathing → start CPR immediately',
      'If they have nitroglycerin spray/tablet with them → help them use it',
      'DO NOT give Aspirin unless doctor confirms it is safe',
      'Tell paramedics: patient has a heart condition'
    ],
    warning: 'Patient has a HEART CONDITION — handle with extreme care'
  },
  {
    name: 'Epilepsy / Seizures',
    condKey: 'epilepsy',
    keywords: ['epilep', 'seizure', 'convuls', 'fits', 'phenytoin', 'valproate', 'levetiracetam', 'carbamazepine', 'epileptic'],
    icon: '⚡',
    color: 'purple',
    instructions: [
      'DO NOT hold the person down or restrain them',
      'Clear the area — remove hard/sharp objects nearby',
      'Place something soft under their head',
      'Turn them on their side after the seizure stops',
      'DO NOT put anything in their mouth — not even fingers',
      'Time the seizure — if it lasts more than 5 minutes → call ambulance',
      'Stay with them until they are fully conscious'
    ],
    warning: 'Patient has EPILEPSY — they may have seizures'
  },
  {
    name: 'Asthma',
    condKey: 'asthma',
    keywords: ['asthma', 'inhaler', 'salbutamol', 'ventolin', 'bronch', 'wheez', 'breathing problem', 'respiratory'],
    icon: '🫁',
    color: 'blue',
    instructions: [
      'Help them sit upright — do NOT lay them down flat',
      'If they have an inhaler with them → help them use it immediately',
      'Keep them calm — panic makes breathing worse',
      'Loosen tight clothing around chest and neck',
      'If no inhaler and breathing is very difficult → call ambulance immediately',
      'Fresh air helps — move away from smoke or dust'
    ],
    warning: 'Patient has ASTHMA — breathing difficulty may occur'
  },
  {
    name: 'Hypertension',
    condKey: 'hyper',
    keywords: ['hypertens', 'blood pressure', 'high bp', 'amlodipine', 'losartan', 'telmisartan', 'ramipril', 'bp patient'],
    icon: '🔴',
    color: 'red',
    instructions: [
      'Keep the person calm and still',
      'DO NOT give any medication unless prescribed',
      'Sit them upright or slightly reclined — not fully flat',
      'Loosen tight clothing',
      'If unconscious → place in recovery position',
      'Tell paramedics: patient has high blood pressure'
    ],
    warning: 'Patient has HIGH BLOOD PRESSURE — keep them calm'
  },
  {
    name: 'Blood Thinners',
    condKey: 'bloodthin',
    keywords: ['warfarin', 'blood thinner', 'anticoagul', 'clexane', 'heparin', 'aspirin', 'clopidogrel', 'rivaroxaban', 'apixaban', 'dabigatran'],
    icon: '💉',
    color: 'yellow',
    instructions: [
      'Patient is on blood thinners — even small injuries can cause serious bleeding',
      'Apply firm pressure on any visible wounds immediately',
      'DO NOT remove any object stuck in a wound',
      'Tell paramedics about blood thinners IMMEDIATELY — affects all treatment decisions',
      'Avoid any unnecessary injections or invasive procedures'
    ],
    warning: 'Patient is on BLOOD THINNERS — bleeding risk is HIGH'
  },
  {
    name: 'Kidney Disease',
    condKey: 'kidney',
    keywords: ['kidney', 'renal', 'dialysis', 'nephro', 'creatinine', 'kidney failure', 'ckd'],
    icon: '🫘',
    color: 'green',
    instructions: [
      'Tell paramedics about kidney disease immediately',
      'DO NOT give extra fluids or IV without doctor approval',
      'Many common medicines are dangerous for kidney patients — inform doctors',
      'If patient is on dialysis → inform hospital immediately',
    ],
    warning: 'Patient has KIDNEY DISEASE — medication choices are critical'
  }
];

/**
 * Detect conditions from free text using keyword matching
 * @param {string} text - text to search in
 * @param {Array} keywords - keywords to look for
 * @returns {boolean}
 */
function hasKeyword(text, keywords) {
  if (!text) return false;
  const lower = text.toLowerCase();
  return keywords.some(keyword => lower.includes(keyword.toLowerCase()));
}

/**
 * Generate first aid instructions based on patient data
 * @param {object} profile - patient profile data
 * @returns {Array} - list of matched conditions with instructions
 */
function generateFirstAidInstructions(profile) {
  const { medicalConditions = '', medications = '', allergies = '', bloodGroup = '', chronicDiseases = [], knownTriggers = '', doctorName = '', doctorPhone = '', preferredHospital = '' } = profile;
  const combinedText = `${medicalConditions} ${medications}`;

  const matched = [];

  // First check chronicDiseases checkboxes (more reliable)
  const checkedNames = chronicDiseases.map(d => d.toLowerCase());

  for (const condition of CONDITIONS) {
    const matchedByCheckbox = checkedNames.some(d =>
      condition.name.toLowerCase().includes(d) || d.includes(condition.name.toLowerCase().split(' ')[0])
    );
    const matchedByKeyword = hasKeyword(combinedText, condition.keywords);

    if (matchedByCheckbox || matchedByKeyword) {
      matched.push(condition);
    }
  }

  // Add allergy warnings
  if (allergies && allergies.toLowerCase() !== 'none' && allergies.trim()) {
    matched.push({
      name: 'Allergies',
      condKey: 'allergy',
      dynValue: allergies,
      icon: '⚠️',
      color: 'yellow',
      warning: `Patient is ALLERGIC to: ${allergies}`,
      instructions: [
        `DO NOT give: ${allergies}`,
        'Inform paramedics and doctors about these allergies IMMEDIATELY',
        'Check all medicines before administering',
        'Watch for allergic reaction signs: rash, swelling, difficulty breathing'
      ]
    });
  }

  // Add known triggers
  if (knownTriggers && knownTriggers.trim()) {
    matched.push({
      name: 'Known Triggers',
      condKey: 'triggers',
      dynValue: knownTriggers,
      icon: '⚠️',
      color: 'orange',
      warning: `Known Triggers: ${knownTriggers}`,
      instructions: [
        `What can trigger this patient's condition: ${knownTriggers}`,
        'Try to identify and remove any trigger from the environment',
        'Inform paramedics about these triggers'
      ]
    });
  }

  // Add doctor info
  if (doctorName || doctorPhone) {
    const instructions = ['Contact the patient\'s doctor for medical history and guidance'];
    if (doctorPhone) instructions.push(`Call Doctor: ${doctorPhone}`);
    matched.push({
      name: 'Doctor Info',
      condKey: 'doctor',
      dynValue: doctorName || '',
      dynPhone: doctorPhone || '',
      icon: '👨‍⚕️',
      color: 'blue',
      warning: `Patient's Doctor: ${doctorName || 'See below'}`,
      instructions
    });
  }

  // Add preferred hospital
  if (preferredHospital && preferredHospital.trim()) {
    matched.push({
      name: 'Preferred Hospital',
      condKey: 'hospital',
      dynValue: preferredHospital,
      icon: '🏥',
      color: 'blue',
      warning: `Take patient to: ${preferredHospital}`,
      instructions: [
        `Patient's preferred hospital: ${preferredHospital}`,
        'Their medical history may already be on file there',
        'Inform ambulance about this preference'
      ]
    });
  }

  // Add blood group info
  if (bloodGroup && bloodGroup !== 'Unknown') {
    matched.push({
      name: 'Blood Group Info',
      condKey: 'blood',
      dynValue: bloodGroup,
      icon: '🩸',
      color: 'red',
      warning: `Blood Group: ${bloodGroup}`,
      instructions: [
        `Patient's blood group is ${bloodGroup}`,
        'Inform hospital/paramedics about blood group immediately',
        'This is critical if blood transfusion is needed'
      ]
    });
  }

  return matched;
}

/**
 * Generate general first aid steps (always shown)
 */
function getGeneralSteps() {
  return [
    'Call emergency services (112) immediately',
    'Check if the person is conscious — tap shoulder and ask "Are you okay?"',
    'Check if they are breathing — look for chest movement',
    'If not breathing → start CPR (30 chest compressions + 2 rescue breaths)',
    'Do not move the person unless they are in danger',
    'Stay with them until help arrives'
  ];
}

module.exports = {
  generateFirstAidInstructions,
  getGeneralSteps
};
