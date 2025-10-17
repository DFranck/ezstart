#!/bin/bash

# Script to generate audit summary report
# Usage: bash scripts/monitoring/generate-audit-report.sh

echo "📊 Generating Audit Report..."
echo ""
echo "# Audit Status Report"
echo "Generated: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""
echo "## Audits Summary"
echo ""

AUDIT_DIR="docs/audits"
TOTAL=0
COMPLETE=0
PARTIAL=0
NOT_AUDITED=0

# Function to extract score from audit file
get_score() {
  local file=$1
  if [ -f "$file" ]; then
    score=$(grep -oP '\*\*Total Score:\*\*\s*\K\d+' "$file" 2>/dev/null)
    if [ ! -z "$score" ]; then
      echo "$score"
    else
      echo "N/A"
    fi
  else
    echo "N/A"
  fi
}

# Function to extract date from audit file
get_date() {
  local file=$1
  if [ -f "$file" ]; then
    date=$(grep -oP '\*\*Last Updated:\*\*\s*\K\d{4}-\d{2}-\d{2}' "$file" 2>/dev/null)
    if [ ! -z "$date" ]; then
      echo "$date"
    else
      echo "Not audited"
    fi
  else
    echo "Not audited"
  fi
}

# Check each audit
for file in "$AUDIT_DIR"/*.md; do
  if [ -f "$file" ]; then
    TOTAL=$((TOTAL + 1))
    filename=$(basename "$file" .md)
    score=$(get_score "$file")
    date=$(get_date "$file")

    # Determine status
    if [ "$score" = "N/A" ]; then
      status="🔴 Not Audited"
      NOT_AUDITED=$((NOT_AUDITED + 1))
    elif [ "$score" -ge 90 ]; then
      status="🟢 Complete"
      COMPLETE=$((COMPLETE + 1))
    else
      status="🟡 Partial"
      PARTIAL=$((PARTIAL + 1))
    fi

    echo "- **$filename**: $status | Score: $score/100 | Last: $date"
  fi
done

echo ""
echo "## Statistics"
echo ""
echo "- **Total Audits**: $TOTAL"
echo "- **Complete**: $COMPLETE ($((COMPLETE * 100 / TOTAL))%)"
echo "- **Partial**: $PARTIAL ($((PARTIAL * 100 / TOTAL))%)"
echo "- **Not Audited**: $NOT_AUDITED ($((NOT_AUDITED * 100 / TOTAL))%)"
echo ""

# Calculate average score
total_score=0
count=0
for file in "$AUDIT_DIR"/*.md; do
  if [ -f "$file" ]; then
    score=$(get_score "$file")
    if [ "$score" != "N/A" ]; then
      total_score=$((total_score + score))
      count=$((count + 1))
    fi
  fi
done

if [ $count -gt 0 ]; then
  avg_score=$((total_score / count))
  echo "- **Average Score**: $avg_score/100"
else
  echo "- **Average Score**: N/A"
fi

echo ""
echo "✅ Report generation complete!"
