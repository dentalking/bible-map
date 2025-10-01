#!/bin/bash

# List of 39 Old Testament books in order
books=(
    "창세기" "출애굽기" "레위기" "민수기" "신명기"
    "여호수아" "사사기" "룻기" "사무엘상" "사무엘하" "열왕기상" "열왕기하" "역대상" "역대하" "에스라" "느헤미야" "에스더"
    "욥기" "시편" "잠언" "전도서" "아가"
    "이사야" "예레미야" "예레미야애가" "에스겔" "다니엘"
    "호세아" "요엘" "아모스" "오바댜" "요나" "미가" "나훔" "하박국" "스바냐" "학개" "스가랴" "말라기"
)

datafile="/Users/heerackbang/Desktop/bible-map-02/js/data.js"

echo "=== Checking Old Testament Book Expansion Status ==="
echo ""

for book in "${books[@]}"; do
    echo "Checking: $book"

    # Find the book section and check for expanded fields
    # Count locations by finding 'name:' fields within the book section
    # Check if historicalContext exists (indicator of expansion)

    # Get line number where book starts
    start_line=$(grep -n "^    '$book':" "$datafile" | cut -d: -f1)

    if [ -z "$start_line" ]; then
        echo "  ❌ Not found in file"
        echo ""
        continue
    fi

    # Get next book's line number (or end of file)
    next_line=$(tail -n +$((start_line + 1)) "$datafile" | grep -n "^    '[^']*':" | head -1 | cut -d: -f1)

    if [ -z "$next_line" ]; then
        # Last book in file
        end_line=$(wc -l < "$datafile")
    else
        end_line=$((start_line + next_line))
    fi

    # Extract the book section
    book_section=$(sed -n "${start_line},${end_line}p" "$datafile")

    # Count total locations (count 'name:' appearances in location objects)
    location_count=$(echo "$book_section" | grep -c "^                name:")

    # Count expanded locations (with historicalContext)
    expanded_count=$(echo "$book_section" | grep -c "historicalContext:")

    echo "  📍 Total locations: $location_count"
    echo "  ✅ Expanded locations: $expanded_count"

    if [ "$expanded_count" -eq "$location_count" ] && [ "$location_count" -gt 0 ]; then
        echo "  ✨ Status: FULLY EXPANDED"
    elif [ "$expanded_count" -gt 0 ]; then
        echo "  ⚠️  Status: PARTIALLY EXPANDED ($expanded_count/$location_count)"
    else
        echo "  ❌ Status: NOT EXPANDED"
    fi

    echo ""
done