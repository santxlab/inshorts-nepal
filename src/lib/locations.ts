import { Province } from "@/types";

export interface ProvinceInfo {
  id: Province;
  name: string;
  nameNe: string;
  capital: string;
  capitalNe: string;
  emoji: string;
  color: string;
  districts: string[];
}

export const PROVINCES: ProvinceInfo[] = [
  {
    id: "koshi",
    name: "Koshi",
    nameNe: "कोशी",
    capital: "Biratnagar",
    capitalNe: "विराटनगर",
    emoji: "🏔️",
    color: "#3B82F6",
    districts: [
      "Taplejung","Panchthar","Ilam","Jhapa","Morang","Sunsari",
      "Dhankuta","Terhathum","Bhojpur","Solukhumbu","Okhaldhunga",
      "Khotang","Udayapur","Saptari","Siraha","Sankhuwa Sabha",
    ],
  },
  {
    id: "madhesh",
    name: "Madhesh",
    nameNe: "मधेश",
    capital: "Janakpurdham",
    capitalNe: "जनकपुरधाम",
    emoji: "🌾",
    color: "#10B981",
    districts: [
      "Parsa","Bara","Rautahat","Sarlahi","Mahottari",
      "Dhanusha","Siraha","Saptari",
    ],
  },
  {
    id: "bagmati",
    name: "Bagmati",
    nameNe: "बागमती",
    capital: "Hetauda",
    capitalNe: "हेटौडा",
    emoji: "🏙️",
    color: "#8B5CF6",
    districts: [
      "Kathmandu","Bhaktapur","Lalitpur","Kavrepalanchok",
      "Sindhupalchok","Rasuwa","Nuwakot","Dhading","Makwanpur",
      "Chitwan","Ramechhap","Sindhuli","Dolakha",
    ],
  },
  {
    id: "gandaki",
    name: "Gandaki",
    nameNe: "गण्डकी",
    capital: "Pokhara",
    capitalNe: "पोखरा",
    emoji: "🏞️",
    color: "#F59E0B",
    districts: [
      "Kaski","Lamjung","Tanahu","Gorkha","Manang",
      "Mustang","Myagdi","Parbat","Baglung","Nawalpur","Syangja",
    ],
  },
  {
    id: "lumbini",
    name: "Lumbini",
    nameNe: "लुम्बिनी",
    capital: "Deukhuri (Butwal)",
    capitalNe: "देउखुरी (बुटवल)",
    emoji: "🛕",
    color: "#EF4444",
    districts: [
      "Rupandehi","Kapilvastu","Nawalparasi West","Palpa","Gulmi",
      "Arghakhanchi","Pyuthan","Rolpa","Rukum East","Dang","Banke","Bardiya",
    ],
  },
  {
    id: "karnali",
    name: "Karnali",
    nameNe: "कर्णाली",
    capital: "Birendranagar",
    capitalNe: "वीरेन्द्रनगर",
    emoji: "🌲",
    color: "#06B6D4",
    districts: [
      "Surkhet","Dailekh","Jajarkot","Dolpa","Humla",
      "Jumla","Kalikot","Mugu","Salyan","Rukum West",
    ],
  },
  {
    id: "sudurpashchim",
    name: "Sudurpashchim",
    nameNe: "सुदूरपश्चिम",
    capital: "Godawari",
    capitalNe: "गोदावरी",
    emoji: "🏕️",
    color: "#F97316",
    districts: [
      "Kailali","Kanchanpur","Dadeldhura","Doti","Achham",
      "Bajhang","Bajura","Baitadi","Darchula",
    ],
  },
];

export function getProvinceById(id: Province): ProvinceInfo | undefined {
  return PROVINCES.find((p) => p.id === id);
}

export function getDistrictsByProvince(id: Province): string[] {
  return getProvinceById(id)?.districts ?? [];
}
