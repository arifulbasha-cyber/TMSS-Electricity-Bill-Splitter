
import React, { createContext, useContext, useState, ReactNode } from 'react';

type Language = 'en' | 'bn';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    // Header
    'app_title': 'TMSS Bill Splitter',
    'install_app': 'Install App',
    'bill_month': 'Bill Month',
    'date_generated': 'Date Generated',
    
    // Config
    'data_input_part': 'Data Input Part',
    'costs_configuration': 'Costs Configuration',
    'total_bill_payable': 'Total Bill Payable',
    'demand_charge': 'Demand Charge',
    'meter_rent': 'Meter Rent',
    'vat_total': 'VAT (Total)',
    'bkash_fee': 'bKash Fee',
    'late_fee': 'Late Fee',
    'bdt': 'BDT',

    // Meter Readings
    'meter_readings': 'Meter Readings',
    'add_meter': 'Add Meter',
    'main_meter': 'Main Meter',
    'user_name': 'User Name',
    'meter_no': 'Meter No',
    'previous': 'Previous',
    'current': 'Current',
    'consumption': 'Consumption',
    'total_user_units': 'Total User Units',
    'remove_meter': 'Remove',

    // Stats
    'consumption_share': 'Consumption Share',
    'no_active_meters': 'No active meters to display stats.',

    // Estimator
    'bill_estimator': 'Bill Estimator',
    'units_to_cost': 'Units to Cost',
    'cost_to_units': 'Cost to Units',
    'units': 'Units',
    'cost': 'Cost',
    'enter_units_used': 'Enter Units Used',
    'enter_total_bill': 'Enter Total Bill Amount',
    'energy_cost_slab': 'Energy Cost (Slab Rate)',
    'total_base': 'Total Base',
    'subject_to_vat': 'Subject to VAT',
    'est_total_payable': 'Est. Total Payable',
    'forward_explainer': 'This calculation uses the LT-A residential slab rates: 0-75 units @ 5.26, 76-200 @ 7.20, 201-300 @ 7.59, 301-400 @ 8.02. Includes 5% VAT on the total base amount.',
    
    // Estimator Reverse Logic
    'est_unit_uses': 'ESTIMATED UNIT USES',
    'reverse_intro_1': 'This is one of the most complex reverse calculations in utility billing because you are dealing with tiered rates.',
    'reverse_intro_2': 'When you know the total bill and need to find the units, you must reverse every step we just performed. This calculation cannot be done with a single formula; it requires a systematic, step-by-step reversal, often involving trial and error or iteration, because the rate per unit depends on the unknown total number of units.',
    'component': 'Component',
    'value': 'Value',
    'fixed_charges': 'Fixed Charges (Demand + Rent)',
    'vat_rate': 'VAT Rate',
    'slab_rates': 'Slab Rates',
    'estimated_consumption': 'Estimated Unit Consumption',
    'key_takeaway': 'Key Takeaway',
    'key_takeaway_text': 'If the price system uses tiered rates, you must reverse the fixed and VAT charges first, then work backward through the tiers to find which slab the final consumption fell into.',
    'enter_bill_prompt': 'Enter a bill amount to see the estimated units breakdown.',

    // Estimator Steps
    'step1_title': '1. ⚙️ Reverse the VAT Calculation',
    'step1_desc': 'First, you must remove the VAT and Fixed Charges to isolate the VAT-Exclusive Energy Cost, which is the amount directly derived from units.',
    'step1a_label': 'Step 1a: Remove VAT to Find the Taxable Base',
    'step1a_text': 'Calculate the VAT amount included in the Total Bill: (Total Bill × VAT Rate) / (1 + VAT Rate). Then subtract this VAT from the Total Bill to get the Taxable Base.',
    'step1b_label': 'Step 1b: Remove Fixed Charges to Find Energy Cost',
    'step1b_text': 'The Total Subject to VAT includes the Fixed Charges. Subtract them to find the energy cost.',
    'step2_title': '2. ⚡ Reverse the Tiered Rate Calculation (The Hard Part)',
    'step2_desc': 'Now you know the VAT-Exclusive Energy Cost. You must now figure out how many units generated this cost, working backward through the slabs.',
    'step3_title': '3. Calculate Total Unit Consumption',
    'step3_desc': 'Sum the units used in all the completed slabs and the units calculated for the final slab.',
    'final_sum': 'Final Sum',
    'final_sum_text': 'Total Units calculated across steps.',
    'no_usage': 'No Usage',
    'no_usage_text': 'Energy cost is zero or negative, meaning the bill only covers fixed charges or is invalid.',
    'test_slab': 'Test Slab',
    'calc_slab': 'Calculate Units in Final Slab',
    'test_slab_text': 'Subtract the cost of the first full slab from your Energy Cost.',
    'calc_slab_text': 'The remaining cost must be the cost generated in this slab. Divide cost by rate.',
    'slab_range': 'Slab Range',
    'units_in_slab': 'Units in Slab',
    'rate': 'Rate',
    'cost_full_slab': 'Cost for Full Slab',
    'above_slab_limit': 'Above Slab Limit',
    'above_slab_text': 'Remaining cost attributed to highest rate.',

    // History
    'bill_history': 'Bill History',
    'restore': 'Restore',
    'delete': 'Delete',
    'confirm_load': 'Load bill for {month}? Current unsaved changes will be lost.',
    'confirm_delete': 'Are you sure you want to delete this record?',
    'saved_success': 'Bill record saved successfully!',
    'saved_at': 'Saved:',

    // Summary / Report
    'bill_report': 'Bill Report',
    'save_history': 'Save',
    'save_image': 'Image',
    'print': 'Print',
    'tmss_house_bill': 'TMSS House Electricity Bill',
    'calculated_rate': 'Calculated Rate/Unit',
    'vat_distributed': 'VAT Distributed',
    'vat_fixed': 'VAT Fixed',
    'vat_desc_1': 'Unit Uses Bill+Demand+Rent*5%',
    'vat_desc_2': 'Unit Uses Bill*5%',
    'vat_desc_3': 'Demand+Rent*5%',
    'final_split': 'Individual Bills',
    'energy_cost': 'Energy Cost',
    'fixed_cost': 'Fixed Costs',
    'total': 'Total',
    'bill': 'Bill',
    'total_collection': 'Total Collection',
    'name': 'Name',
    'user': 'User',
    'unit': 'Unit',
    'engy': 'Engy', // Short for Energy
    'fixed': 'Fixed',
    'how_calc': 'How is this calculated?',
    'Uttom': 'Uttom',
    'Anayet': 'Anayet',
    'Arif': 'Arif',
  },
  bn: {
    // Header
    'app_title': 'টিএমএসএস বিল স্প্লিটার',
    'install_app': 'ইনস্টল অ্যাপ',
    'bill_month': 'বিলের মাস',
    'date_generated': 'তৈরির তারিখ',

    // Config
    'data_input_part': 'ডেটা ইনপুট অংশ',
    'costs_configuration': 'খরচ কনফিগারেশন',
    'total_bill_payable': 'মোট বিল প্রদেয়',
    'demand_charge': 'ডিমান্ড চার্জ',
    'meter_rent': 'মিটার ভাড়া',
    'vat_total': 'ভ্যাট (মোট)',
    'bkash_fee': 'বিকাশ ফি',
    'late_fee': 'বিলম্ব ফি',
    'bdt': 'টাকা',

    // Meter Readings
    'meter_readings': 'মিটার রিডিং',
    'add_meter': 'মিটার যোগ করুন',
    'main_meter': 'মেইন মিটার',
    'user_name': 'ব্যবহারকারীর নাম',
    'meter_no': 'মিটার নং',
    'previous': 'পূর্ববর্তী',
    'current': 'বর্তমান',
    'consumption': 'ব্যবহার',
    'total_user_units': 'মোট ব্যবহারকারী ইউনিট',
    'remove_meter': 'মুছুন',

    // Stats
    'consumption_share': 'ব্যবহারের ভাগ',
    'no_active_meters': 'প্রদর্শন করার জন্য কোন সক্রিয় মিটার নেই।',

    // Estimator
    'bill_estimator': 'বিল এস্টিমেটর',
    'units_to_cost': 'ইউনিট থেকে খরচ',
    'cost_to_units': 'খরচ থেকে ইউনিট',
    'units': 'ইউনিট',
    'cost': 'খরচ',
    'enter_units_used': 'ব্যবহৃত ইউনিট লিখুন',
    'enter_total_bill': 'মোট বিলের পরিমাণ লিখুন',
    'energy_cost_slab': 'এনার্জি খরচ (স্ল্যাব রেট)',
    'total_base': 'মোট বেস',
    'subject_to_vat': 'ভ্যাট প্রযোজ্য',
    'est_total_payable': 'আনুমানিক মোট প্রদেয়',
    'forward_explainer': 'এই গণনা LT-A আবাসিক স্ল্যাব রেট ব্যবহার করে: 0-75 ইউনিট @ 5.26, 76-200 @ 7.20, 201-300 @ 7.59, 301-400 @ 8.02। মোট বেস পরিমাণের উপর 5% ভ্যাট অন্তর্ভুক্ত।',

    // Estimator Reverse Logic
    'est_unit_uses': 'আনুমানিক ইউনিট ব্যবহার',
    'reverse_intro_1': 'এটি ইউটিলিটি বিলিংয়ের অন্যতম জটিল বিপরীত গণনা কারণ এখানে টায়ার্ড রেট রয়েছে।',
    'reverse_intro_2': 'যখন আপনি মোট বিল জানেন এবং ইউনিট বের করতে চান, তখন প্রতিটি ধাপ উল্টো করতে হবে। এটি একক সূত্রে করা যায় না; এর জন্য ধাপে ধাপে বিপরীত গণনা প্রয়োজন।',
    'component': 'উপাদান',
    'value': 'মান',
    'fixed_charges': 'ফিক্সড চার্জ (ডিমান্ড + ভাড়া)',
    'vat_rate': 'ভ্যাট রেট',
    'slab_rates': 'স্ল্যাব রেট',
    'estimated_consumption': 'আনুমানিক ইউনিট খরচ',
    'key_takeaway': 'মূল কথা',
    'key_takeaway_text': 'যদি প্রাইস সিস্টেমে টায়ার্ড রেট থাকে, তবে প্রথমে ফিক্সড চার্জ এবং ভ্যাট সরাতে হবে, তারপর স্ল্যাবগুলোর মাধ্যমে উল্টো দিকে কাজ করে দেখতে হবে শেষ খরচ কোন স্ল্যাবে পড়েছে।',
    'enter_bill_prompt': 'ইউনিট ব্রেকডাউন দেখতে বিলের পরিমাণ লিখুন।',

    // Estimator Steps
    'step1_title': '১. ⚙️ ভ্যাট গণনা বিপরীত করুন',
    'step1_desc': 'প্রথমে, ভ্যাট এবং ফিক্সড চার্জ সরিয়ে ভ্যাট-মুক্ত এনার্জি খরচ বের করতে হবে, যা সরাসরি ইউনিট থেকে আসে।',
    'step1a_label': 'ধাপ ১ক: ভ্যাট সরিয়ে ট্যাক্সেবল বেস খুঁজুন',
    'step1a_text': 'মোট বিলে অন্তর্ভুক্ত ভ্যাটের পরিমাণ গণনা করুন: (মোট বিল × ভ্যাট রেট) ÷ (১ + ভ্যাট রেট)। এরপর মোট বিল থেকে এই ভ্যাট বিয়োগ করে ট্যাক্সেবল বেস বের করুন।',
    'step1b_label': 'ধাপ ১খ: ফিক্সড চার্জ সরিয়ে এনার্জি খরচ খুঁজুন',
    'step1b_text': 'ভ্যাট প্রযোজ্য মোটের মধ্যে ফিক্সড চার্জ অন্তর্ভুক্ত। এনার্জি খরচ পেতে তা বিয়োগ করুন।',
    'step2_title': '২. ⚡ টায়ার্ড রেট গণনা বিপরীত করুন (কঠিন অংশ)',
    'step2_desc': 'এখন আপনি ভ্যাট-মুক্ত এনার্জি খরচ জানেন। এখন স্ল্যাবগুলোর মাধ্যমে উল্টো দিকে কাজ করে বের করতে হবে কত ইউনিট এই খরচ তৈরি করেছে।',
    'step3_title': '৩. মোট ইউনিট খরচ গণনা',
    'step3_desc': 'সকল পূর্ণ স্ল্যাব এবং শেষ স্ল্যাবের জন্য গণনা করা ইউনিট যোগ করুন।',
    'final_sum': 'চূড়ান্ত যোগফল',
    'final_sum_text': 'ধাপগুলো জুড়ে গণনা করা মোট ইউনিট।',
    'no_usage': 'কোনো ব্যবহার নেই',
    'no_usage_text': 'এনার্জি খরচ শূন্য বা নেতিবাচক, যার অর্থ বিলটি শুধুমাত্র ফিক্সড চার্জ কভার করে বা ভুল।',
    'test_slab': 'স্ল্যাব পরীক্ষা',
    'calc_slab': 'শেষ স্ল্যাবে ইউনিট গণনা',
    'test_slab_text': 'আপনার এনার্জি খরচ থেকে প্রথম পূর্ণ স্ল্যাবের খরচ বিয়োগ করুন।',
    'calc_slab_text': 'অবশিষ্ট খরচ অবশ্যই এই স্ল্যাবে তৈরি হয়েছে। খরচকে রেট দিয়ে ভাগ করুন।',
    'slab_range': 'স্ল্যাব রেঞ্জ',
    'units_in_slab': 'স্ল্যাবে ইউনিট',
    'rate': 'রেট',
    'cost_full_slab': 'পূর্ণ স্ল্যাবের খরচ',
    'above_slab_limit': 'স্ল্যাব সীমার উপরে',
    'above_slab_text': 'অবশিষ্ট খরচ সর্বোচ্চ রেটে ধরা হয়েছে।',

    // History
    'bill_history': 'বিল ইতিহাস',
    'restore': 'রিস্টোর',
    'delete': 'মুছুন',
    'confirm_load': '{month}-এর বিল লোড করবেন? বর্তমান অসংরক্ষিত পরিবর্তন হারিয়ে যাবে।',
    'confirm_delete': 'আপনি কি নিশ্চিত যে আপনি এই রেকর্ডটি মুছতে চান?',
    'saved_success': 'বিল রেকর্ড সফলভাবে সংরক্ষিত হয়েছে!',
    'saved_at': 'সংরক্ষিত:',

    // Summary / Report
    'bill_report': 'বিল রিপোর্ট',
    'save_history': 'সেভ',
    'save_image': 'ইমেজ',
    'print': 'প্রিন্ট',
    'tmss_house_bill': 'টিএমএসএস হাউস বিদ্যুৎ বিল',
    'calculated_rate': 'গণনাকৃত রেট/ইউনিট',
    'vat_distributed': 'ভ্যাট (বন্টিত)',
    'vat_fixed': 'ভ্যাট (ফিক্সড)',
    'vat_desc_1': 'ইউনিট বিল+ডিমান্ড+ভাড়া*৫%',
    'vat_desc_2': 'ইউনিট বিল*৫%',
    'vat_desc_3': 'ডিমান্ড+ভাড়া*৫%',
    'final_split': 'ব্যক্তিগত বিল',
    'energy_cost': 'এনার্জি খরচ',
    'fixed_cost': 'ফিক্সড খরচ',
    'total': 'মোট',
    'bill': 'বিল',
    'total_collection': 'মোট সংগ্রহ',
    'name': 'নাম',
    'user': 'ব্যবহারকারী',
    'unit': 'ইউনিট',
    'engy': 'এনার্জি',
    'fixed': 'ফিক্সড',
    'how_calc': 'এটি কীভাবে গণনা করা হয়?',
    'Uttom': 'উত্তম',
    'Anayet': 'এনায়েত',
    'Arif': 'আরিফ',
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('en');

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
