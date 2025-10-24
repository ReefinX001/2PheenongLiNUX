#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json
import re
import sys

def create_official_provinces_reference():
    """Create official reference for all 77 Thai provinces with 2024 data"""

    official_provinces = [
        {"id": 1, "name_th": "กรุงเทพมหานคร", "name_en": "Bangkok", "region": "กลาง", "districts": 50},
        {"id": 2, "name_th": "สมุทรปราการ", "name_en": "Samut Prakan", "region": "กลาง", "districts": 6},
        {"id": 3, "name_th": "นนทบุรี", "name_en": "Nonthaburi", "region": "กลาง", "districts": 6},
        {"id": 4, "name_th": "ปทุมธานี", "name_en": "Pathum Thani", "region": "กลาง", "districts": 7},
        {"id": 5, "name_th": "พระนครศรีอยุธยา", "name_en": "Phra Nakhon Si Ayutthaya", "region": "กลาง", "districts": 16},
        {"id": 6, "name_th": "อ่างทอง", "name_en": "Ang Thong", "region": "กลาง", "districts": 7},
        {"id": 7, "name_th": "ลพบุรี", "name_en": "Lopburi", "region": "กลาง", "districts": 11},
        {"id": 8, "name_th": "สิงห์บุรี", "name_en": "Sing Buri", "region": "กลาง", "districts": 6},
        {"id": 9, "name_th": "ชัยนาท", "name_en": "Chai Nat", "region": "กลาง", "districts": 8},
        {"id": 10, "name_th": "สระบุรี", "name_en": "Saraburi", "region": "กลาง", "districts": 13},
        {"id": 11, "name_th": "ชลบุรี", "name_en": "Chonburi", "region": "ตะวันออก", "districts": 11},
        {"id": 12, "name_th": "ระยอง", "name_en": "Rayong", "region": "ตะวันออก", "districts": 8},
        {"id": 13, "name_th": "จันทบุรี", "name_en": "Chanthaburi", "region": "ตะวันออก", "districts": 10},
        {"id": 14, "name_th": "ตราด", "name_en": "Trat", "region": "ตะวันออก", "districts": 7},
        {"id": 15, "name_th": "ฉะเชิงเทรา", "name_en": "Chachoengsao", "region": "ตะวันออก", "districts": 11},
        {"id": 16, "name_th": "ปราจีนบุรี", "name_en": "Prachinburi", "region": "ตะวันออก", "districts": 7},
        {"id": 17, "name_th": "นครนายก", "name_en": "Nakhon Nayok", "region": "ตะวันออก", "districts": 4},
        {"id": 18, "name_th": "สระแก้ว", "name_en": "Sa Kaeo", "region": "ตะวันออก", "districts": 9},
        {"id": 19, "name_th": "นครราชสีมา", "name_en": "Nakhon Ratchasima", "region": "ตะวันออกเฉียงเหนือ", "districts": 32},
        {"id": 20, "name_th": "บุรีรัมย์", "name_en": "Buriram", "region": "ตะวันออกเฉียงเหนือ", "districts": 23},
        {"id": 21, "name_th": "สุรินทร์", "name_en": "Surin", "region": "ตะวันออกเฉียงเหนือ", "districts": 17},
        {"id": 22, "name_th": "ศรีสะเกษ", "name_en": "Sisaket", "region": "ตะวันออกเฉียงเหนือ", "districts": 22},
        {"id": 23, "name_th": "อุบลราชธานี", "name_en": "Ubon Ratchathani", "region": "ตะวันออกเฉียงเหนือ", "districts": 25},
        {"id": 24, "name_th": "ยโสธร", "name_en": "Yasothon", "region": "ตะวันออกเฉียงเหนือ", "districts": 9},
        {"id": 25, "name_th": "ชัยภูมิ", "name_en": "Chaiyaphum", "region": "ตะวันออกเฉียงเหนือ", "districts": 16},
        {"id": 26, "name_th": "อำนาจเจริญ", "name_en": "Amnat Charoen", "region": "ตะวันออกเฉียงเหนือ", "districts": 7},
        {"id": 27, "name_th": "หนองบัวลำภู", "name_en": "Nong Bua Lamphu", "region": "ตะวันออกเฉียงเหนือ", "districts": 6},
        {"id": 28, "name_th": "ขอนแก่น", "name_en": "Khon Kaen", "region": "ตะวันออกเฉียงเหนือ", "districts": 26},
        {"id": 29, "name_th": "อุดรธานี", "name_en": "Udon Thani", "region": "ตะวันออกเฉียงเหนือ", "districts": 20},
        {"id": 30, "name_th": "เลย", "name_en": "Loei", "region": "ตะวันออกเฉียงเหนือ", "districts": 14},
        {"id": 31, "name_th": "หนองคาย", "name_en": "Nong Khai", "region": "ตะวันออกเฉียงเหนือ", "districts": 9},
        {"id": 32, "name_th": "มหาสารคาม", "name_en": "Maha Sarakham", "region": "ตะวันออกเ�็ียงเหนือ", "districts": 13},
        {"id": 33, "name_th": "ร้อยเอ็ด", "name_en": "Roi Et", "region": "ตะวันออกเฉียงเหนือ", "districts": 20},
        {"id": 34, "name_th": "กาฬสินธุ์", "name_en": "Kalasin", "region": "ตะวันออกเฉียงเหนือ", "districts": 18},
        {"id": 35, "name_th": "สกลนคร", "name_en": "Sakon Nakhon", "region": "ตะวันออกเฉียงเหนือ", "districts": 18},
        {"id": 36, "name_th": "นครพนม", "name_en": "Nakhon Phanom", "region": "ตะวันออกเฉียงเหนือ", "districts": 12},
        {"id": 37, "name_th": "มุกดาหาร", "name_en": "Mukdahan", "region": "ตะวันออกเฉียงเหนือ", "districts": 7},
        {"id": 38, "name_th": "เชียงใหม่", "name_en": "Chiang Mai", "region": "เหนือ", "districts": 25},
        {"id": 39, "name_th": "ลำหุ้น", "name_en": "Lamphun", "region": "เหนือ", "districts": 8},
        {"id": 40, "name_th": "ลำปาง", "name_en": "Lampang", "region": "เหนือ", "districts": 13},
        {"id": 41, "name_th": "อุตรดิตถ์", "name_en": "Uttaradit", "region": "เหนือ", "districts": 9},
        {"id": 42, "name_th": "แพร่", "name_en": "Phrae", "region": "เหนือ", "districts": 8},
        {"id": 43, "name_th": "น่าน", "name_en": "Nan", "region": "เหนือ", "districts": 15},
        {"id": 44, "name_th": "พะเยา", "name_en": "Phayao", "region": "เหนือ", "districts": 9},
        {"id": 45, "name_th": "เชียงราย", "name_en": "Chiang Rai", "region": "เหนือ", "districts": 18},
        {"id": 46, "name_th": "แม่ฮ่องสอน", "name_en": "Mae Hong Son", "region": "เหนือ", "districts": 7},
        {"id": 47, "name_th": "นครสวรรค์", "name_en": "Nakhon Sawan", "region": "กลาง", "districts": 15},
        {"id": 48, "name_th": "อุทัยธานี", "name_en": "Uthai Thani", "region": "กลาง", "districts": 8},
        {"id": 49, "name_th": "กำแพงเพชร", "name_en": "Kamphaeng Phet", "region": "กลาง", "districts": 11},
        {"id": 50, "name_th": "ตาก", "name_en": "Tak", "region": "ตะวันตก", "districts": 9},
        {"id": 51, "name_th": "สุโขทัย", "name_en": "Sukhothai", "region": "กลาง", "districts": 9},
        {"id": 52, "name_th": "พิษณุโลก", "name_en": "Phitsanulok", "region": "กลาง", "districts": 9},
        {"id": 53, "name_th": "พิจิตร", "name_en": "Phichit", "region": "กลาง", "districts": 12},
        {"id": 54, "name_th": "เพชรบูรณ์", "name_en": "Phetchabun", "region": "กลาง", "districts": 11},
        {"id": 55, "name_th": "ราชบุรี", "name_en": "Ratchaburi", "region": "ตะวันตก", "districts": 10},
        {"id": 56, "name_th": "กาญจนบุรี", "name_en": "Kanchanaburi", "region": "ตะวันตก", "districts": 13},
        {"id": 57, "name_th": "สุพรรณบุรี", "name_en": "Suphan Buri", "region": "กลาง", "districts": 10},
        {"id": 58, "name_th": "นครปฐม", "name_en": "Nakhon Pathom", "region": "กลาง", "districts": 7},
        {"id": 59, "name_th": "สมุทรสาคร", "name_en": "Samut Sakhon", "region": "กลาง", "districts": 3},
        {"id": 60, "name_th": "สมุทรสงคราม", "name_en": "Samut Songkhram", "region": "กลาง", "districts": 3},
        {"id": 61, "name_th": "เพชรบุรี", "name_en": "Phetchaburi", "region": "ตะวันตก", "districts": 8},
        {"id": 62, "name_th": "ประจวบคีรีขันธ์", "name_en": "Prachuap Khiri Khan", "region": "ตะวันตก", "districts": 8},
        {"id": 63, "name_th": "นครศรีธรรมราช", "name_en": "Nakhon Si Thammarat", "region": "ใต้", "districts": 23},
        {"id": 64, "name_th": "กระบี่", "name_en": "Krabi", "region": "ใต้", "districts": 8},
        {"id": 65, "name_th": "พังงา", "name_en": "Phang Nga", "region": "ใต้", "districts": 8},
        {"id": 66, "name_th": "ภูเก็ต", "name_en": "Phuket", "region": "ใต้", "districts": 3},
        {"id": 67, "name_th": "สุราษฎร์ธานี", "name_en": "Surat Thani", "region": "ใต้", "districts": 19},
        {"id": 68, "name_th": "ระนอง", "name_en": "Ranong", "region": "ใต้", "districts": 5},
        {"id": 69, "name_th": "ชุมพร", "name_en": "Chumphon", "region": "ใต้", "districts": 8},
        {"id": 70, "name_th": "สงขลา", "name_en": "Songkhla", "region": "ใต้", "districts": 16},
        {"id": 71, "name_th": "สตูล", "name_en": "Satun", "region": "ใต้", "districts": 7},
        {"id": 72, "name_th": "ตรัง", "name_en": "Trang", "region": "ใต้", "districts": 10},
        {"id": 73, "name_th": "พัทลุง", "name_en": "Phatthalung", "region": "ใต้", "districts": 11},
        {"id": 74, "name_th": "ปัตตานี", "name_en": "Pattani", "region": "ใต้", "districts": 12},
        {"id": 75, "name_th": "ยะลา", "name_en": "Yala", "region": "ใต้", "districts": 8},
        {"id": 76, "name_th": "นราธิวาส", "name_en": "Narathiwat", "region": "ใต้", "districts": 13},
        {"id": 77, "name_th": "บึงกาฬ", "name_en": "Bueng Kan", "region": "ตะวันออกเฉียงเหนือ", "districts": 8}
    ]

    return official_provinces

def verify_province_data():
    """Comprehensive verification of all 77 provinces data"""

    print("=== COMPREHENSIVE THAI PROVINCES VERIFICATION ===")
    print("Verifying all 77 provinces with 2024 administrative structure...")
    print()

    try:
        # Load current data
        with open('api_province_with_amphure_tambon.json', 'r', encoding='utf-8') as f:
            current_data = json.load(f)

        # Load official reference
        official_provinces = create_official_provinces_reference()

        print(f"Current data contains: {len(current_data)} provinces")
        print(f"Official reference contains: {len(official_provinces)} provinces")
        print()

        # Create lookup dictionaries
        current_by_id = {p['id']: p for p in current_data}
        official_by_id = {p['id']: p for p in official_provinces}

        errors_found = []
        corrections_needed = []

        print("=== VERIFICATION RESULTS ===")

        # Check each province
        for official in official_provinces:
            official_id = official['id']
            current = current_by_id.get(official_id)

            if not current:
                errors_found.append(f"❌ Province ID {official_id} missing: {official['name_th']}")
                continue

            # Check Thai name
            if current['name_th'] != official['name_th']:
                corrections_needed.append({
                    'type': 'thai_name',
                    'id': official_id,
                    'current': current['name_th'],
                    'correct': official['name_th']
                })

            # Check English name
            if current['name_en'] != official['name_en']:
                corrections_needed.append({
                    'type': 'english_name',
                    'id': official_id,
                    'current': current['name_en'],
                    'correct': official['name_en']
                })

            # Check district count
            current_districts = len(current.get('amphure', []))
            if current_districts != official['districts']:
                corrections_needed.append({
                    'type': 'district_count',
                    'id': official_id,
                    'name': official['name_th'],
                    'current': current_districts,
                    'correct': official['districts']
                })

        # Report findings
        if not errors_found and not corrections_needed:
            print("SUCCESS: ALL PROVINCES VERIFIED SUCCESSFULLY!")
            print("   - All 77 provinces present")
            print("   - Thai spellings accurate")
            print("   - English transliterations correct")
            print("   - District counts match official data")
        else:
            if errors_found:
                print("CRITICAL ERRORS FOUND:")
                for error in errors_found:
                    print(f"   {error}")
                print()

            if corrections_needed:
                print("CORRECTIONS NEEDED:")
                thai_name_errors = [c for c in corrections_needed if c['type'] == 'thai_name']
                english_name_errors = [c for c in corrections_needed if c['type'] == 'english_name']
                district_errors = [c for c in corrections_needed if c['type'] == 'district_count']

                if thai_name_errors:
                    print(f"   Thai name spelling errors: {len(thai_name_errors)}")
                    for error in thai_name_errors[:5]:  # Show first 5
                        try:
                            print(f"     • ID {error['id']}: '{error['current']}' -> '{error['correct']}'")
                        except UnicodeEncodeError:
                            print(f"     • ID {error['id']}: [Thai text] -> [corrected Thai text]")
                    if len(thai_name_errors) > 5:
                        print(f"     ... and {len(thai_name_errors) - 5} more")

                if english_name_errors:
                    print(f"   English name errors: {len(english_name_errors)}")
                    for error in english_name_errors:
                        print(f"     • ID {error['id']}: '{error['current']}' -> '{error['correct']}'")

                if district_errors:
                    print(f"   District count errors: {len(district_errors)}")
                    for error in district_errors[:5]:  # Show first 5
                        try:
                            print(f"     • {error['name']}: {error['current']} -> {error['correct']} districts")
                        except UnicodeEncodeError:
                            print(f"     • ID {error['id']}: {error['current']} -> {error['correct']} districts")

        print()
        print("=== DATA QUALITY ASSESSMENT ===")

        # Quality metrics
        total_provinces = len(official_provinces)
        correct_thai = total_provinces - len([c for c in corrections_needed if c['type'] == 'thai_name'])
        correct_english = total_provinces - len([c for c in corrections_needed if c['type'] == 'english_name'])
        correct_districts = total_provinces - len([c for c in corrections_needed if c['type'] == 'district_count'])

        print(f"Thai spelling accuracy: {correct_thai}/{total_provinces} ({correct_thai/total_provinces*100:.1f}%)")
        print(f"English name accuracy: {correct_english}/{total_provinces} ({correct_english/total_provinces*100:.1f}%)")
        print(f"District count accuracy: {correct_districts}/{total_provinces} ({correct_districts/total_provinces*100:.1f}%)")

        overall_accuracy = (correct_thai + correct_english + correct_districts) / (total_provinces * 3) * 100
        print(f"Overall data accuracy: {overall_accuracy:.1f}%")

        return current_data, corrections_needed, errors_found

    except Exception as e:
        print(f"Error during verification: {e}")
        return None, [], []

if __name__ == "__main__":
    verify_province_data()