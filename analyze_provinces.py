#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json
import sys

def analyze_provinces():
    """Analyze the current province data structure"""

    try:
        with open('api_province_with_amphure_tambon.json', 'r', encoding='utf-8') as f:
            data = json.load(f)

        print("=== THAI PROVINCES DATA ANALYSIS ===")
        print(f"Total provinces in data: {len(data)}")
        print()

        # Count verified vs unverified
        verified_count = 0
        province_summary = []

        for province in data:
            province_info = {
                'id': province.get('id'),
                'name_th': province.get('name_th'),
                'name_en': province.get('name_en'),
                'district_count': len(province.get('amphure', [])),
                'has_subdistricts': any(len(district.get('tambon', [])) > 0 for district in province.get('amphure', []))
            }
            province_summary.append(province_info)

            if province_info['has_subdistricts']:
                verified_count += 1

        print(f"Provinces with sub-district data: {verified_count}")
        print(f"Provinces needing updates: {len(data) - verified_count}")
        print()

        # Show all provinces
        print("=== ALL PROVINCES LIST ===")
        for i, prov in enumerate(province_summary, 1):
            status = "Complete" if prov['has_subdistricts'] else "Needs Update"
            try:
                print(f"{i:2}. {prov['name_th']} ({prov['name_en']}) - {prov['district_count']} districts - {status}")
            except UnicodeEncodeError:
                print(f"{i:2}. [Thai Name] ({prov['name_en']}) - {prov['district_count']} districts - {status}")

        print()
        print("=== PRIORITY UPDATES NEEDED ===")

        # Identify high-priority provinces that need updates
        high_priority = ['กรุงเทพมหานคร', 'เชียงใหม่', 'นครราชสีมา', 'ขอนแก่น', 'อุบลราชธานี',
                        'สุราษฎร์ธานี', 'หาดใหญ่', 'ชลบุรี', 'ระยอง', 'สมุทรปราการ',
                        'ปทุมธานี', 'นนทบุรี', 'สงขลา', 'ภูเก็ต', 'กาญจนบุรี']

        needs_update = []
        for prov in province_summary:
            if not prov['has_subdistricts']:
                priority = "HIGH" if any(hp in prov['name_th'] for hp in high_priority) else "MEDIUM"
                needs_update.append({
                    'province': prov,
                    'priority': priority
                })

        # Sort by priority
        high_prio = [p for p in needs_update if p['priority'] == 'HIGH']
        med_prio = [p for p in needs_update if p['priority'] == 'MEDIUM']

        print("HIGH PRIORITY:")
        for item in high_prio:
            prov = item['province']
            try:
                print(f"  • {prov['name_th']} ({prov['name_en']}) - {prov['district_count']} districts")
            except UnicodeEncodeError:
                print(f"  • [Thai Name] ({prov['name_en']}) - {prov['district_count']} districts")

        print()
        print("MEDIUM PRIORITY:")
        for item in med_prio[:10]:  # Show first 10
            prov = item['province']
            try:
                print(f"  • {prov['name_th']} ({prov['name_en']}) - {prov['district_count']} districts")
            except UnicodeEncodeError:
                print(f"  • [Thai Name] ({prov['name_en']}) - {prov['district_count']} districts")

        if len(med_prio) > 10:
            print(f"  ... and {len(med_prio) - 10} more provinces")

        return data, province_summary

    except Exception as e:
        print(f"Error analyzing data: {e}")
        return None, None

if __name__ == "__main__":
    analyze_provinces()