#!/usr/bin/env bash
# =============================================================================
# VINSTOUR TRAVEL PORTAL — Migration Runner
# Jalankan semua 12 file migrasi ke Supabase Cloud secara berurutan.
#
# CARA PAKAI:
#   1. Dapatkan DATABASE_URL dari Supabase Dashboard:
#      Project Settings → Database → Connection string → URI → mode: Session
#      Ganti [YOUR-PASSWORD] dengan password database Anda.
#
#   2. Jalankan:
#      bash run_migration.sh "postgresql://postgres:[YOUR-PASSWORD]@db.<ref>.supabase.co:5432/postgres"
#
#      Atau simpan ke environment variable:
#      export DATABASE_URL="postgresql://postgres:..."
#      bash run_migration.sh
# =============================================================================

set -e  # Hentikan jika ada error fatal

# ---------------------------------------------------------------------------
# Warna output
# ---------------------------------------------------------------------------
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

ok()   { echo -e "${GREEN}✅ $1${NC}"; }
err()  { echo -e "${RED}❌ $1${NC}"; }
info() { echo -e "${CYAN}ℹ  $1${NC}"; }
warn() { echo -e "${YELLOW}⚠  $1${NC}"; }

# ---------------------------------------------------------------------------
# Ambil DATABASE_URL dari argumen atau environment
# ---------------------------------------------------------------------------
DATABASE_URL="${1:-$DATABASE_URL}"

if [ -z "$DATABASE_URL" ]; then
  err "DATABASE_URL tidak ditemukan."
  echo ""
  echo -e "${BOLD}Cara mendapatkan DATABASE_URL:${NC}"
  echo "  1. Buka https://supabase.com/dashboard"
  echo "  2. Pilih project Anda"
  echo "  3. Klik Project Settings → Database"
  echo "  4. Scroll ke 'Connection string' → pilih tab 'URI'"
  echo "  5. Pastikan mode: Session (port 5432)"
  echo "  6. Salin string lalu ganti [YOUR-PASSWORD]"
  echo ""
  echo -e "${BOLD}Contoh:${NC}"
  echo "  bash run_migration.sh \"postgresql://postgres:mypassword@db.abcdefgh.supabase.co:5432/postgres\""
  exit 1
fi

# ---------------------------------------------------------------------------
# Cek psql tersedia
# ---------------------------------------------------------------------------
if ! command -v psql &>/dev/null; then
  err "psql tidak ditemukan. Install terlebih dahulu:"
  echo ""
  echo "  macOS  : brew install libpq && brew link --force libpq"
  echo "  Ubuntu : sudo apt-get install postgresql-client"
  echo "  Windows: https://www.postgresql.org/download/windows/"
  exit 1
fi

# ---------------------------------------------------------------------------
# Daftar 12 file migrasi (urutan wajib)
# ---------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

MIGRATIONS=(
  "000_extensions.sql"
  "001_enums.sql"
  "002_tables_core.sql"
  "003_tables_users.sql"
  "004_tables_travel.sql"
  "005_tables_finance.sql"
  "006_indexes.sql"
  "007_functions.sql"
  "008_triggers.sql"
  "009_rls_policies.sql"
  "010_views.sql"
  "011_seed_admin.sql"
)

TOTAL=${#MIGRATIONS[@]}
PASSED=0
FAILED=0
FAILED_FILES=()

# ---------------------------------------------------------------------------
# Banner
# ---------------------------------------------------------------------------
echo ""
echo -e "${BOLD}=================================================${NC}"
echo -e "${BOLD}   VINSTOUR — Supabase Migration Runner${NC}"
echo -e "${BOLD}=================================================${NC}"
echo -e "  Target : ${CYAN}$(echo "$DATABASE_URL" | sed 's/:\/\/[^:]*:[^@]*@/:\/\/***:***@/')${NC}"
echo -e "  Files  : ${TOTAL} migration files"
echo -e "  Dir    : ${SCRIPT_DIR}"
echo -e "${BOLD}=================================================${NC}"
echo ""

# ---------------------------------------------------------------------------
# Test koneksi
# ---------------------------------------------------------------------------
info "Testing database connection..."
if ! psql "$DATABASE_URL" -c "SELECT 1" -q --no-psqlrc &>/dev/null; then
  err "Gagal konek ke database. Cek DATABASE_URL dan pastikan password benar."
  exit 1
fi
ok "Connection OK"
echo ""

# ---------------------------------------------------------------------------
# Jalankan setiap file migrasi
# ---------------------------------------------------------------------------
START_TIME=$(date +%s)

for i in "${!MIGRATIONS[@]}"; do
  FILE="${MIGRATIONS[$i]}"
  FILEPATH="$SCRIPT_DIR/$FILE"
  NUM=$((i + 1))

  printf "${BOLD}[%02d/%02d]${NC} Running ${CYAN}%s${NC}..." "$NUM" "$TOTAL" "$FILE"

  if [ ! -f "$FILEPATH" ]; then
    echo ""
    warn "File tidak ditemukan: $FILEPATH — dilewati"
    continue
  fi

  # Jalankan file SQL, tangkap output dan error
  OUTPUT=$(psql "$DATABASE_URL" \
    --no-psqlrc \
    --set ON_ERROR_STOP=off \
    -v ON_ERROR_STOP=off \
    -f "$FILEPATH" \
    2>&1)
  EXIT_CODE=$?

  # Cek apakah ada ERROR (bukan NOTICE/WARNING)
  if echo "$OUTPUT" | grep -q "^ERROR:"; then
    echo ""
    err "FAILED: $FILE"
    echo "$OUTPUT" | grep "^ERROR:" | head -5 | while read -r line; do
      echo -e "  ${RED}$line${NC}"
    done
    FAILED=$((FAILED + 1))
    FAILED_FILES+=("$FILE")
  else
    # Ambil result line jika ada
    RESULT=$(echo "$OUTPUT" | grep "^[0-9][0-9]*_.*OK" | head -1)
    if [ -n "$RESULT" ]; then
      echo -e " ${GREEN}OK${NC}"
    else
      echo -e " ${GREEN}OK${NC}"
    fi
    # Tampilkan NOTICE jika ada (informatif)
    NOTICES=$(echo "$OUTPUT" | grep "^NOTICE:" | wc -l | tr -d ' ')
    if [ "$NOTICES" -gt "0" ]; then
      echo "$OUTPUT" | grep "^NOTICE:" | while read -r line; do
        echo -e "  ${YELLOW}↳ $line${NC}"
      done
    fi
    PASSED=$((PASSED + 1))
  fi
done

# ---------------------------------------------------------------------------
# Ringkasan
# ---------------------------------------------------------------------------
END_TIME=$(date +%s)
ELAPSED=$((END_TIME - START_TIME))

echo ""
echo -e "${BOLD}=================================================${NC}"
echo -e "${BOLD}   HASIL MIGRASI${NC}"
echo -e "${BOLD}=================================================${NC}"
echo -e "  Berhasil  : ${GREEN}${PASSED}/${TOTAL}${NC}"
echo -e "  Gagal     : ${RED}${FAILED}/${TOTAL}${NC}"
echo -e "  Waktu     : ${ELAPSED} detik"

if [ ${#FAILED_FILES[@]} -gt 0 ]; then
  echo ""
  err "File yang gagal:"
  for f in "${FAILED_FILES[@]}"; do
    echo -e "  ${RED}• $f${NC}"
  done
  echo ""
  warn "Jalankan file yang gagal secara manual di Supabase SQL Editor"
  echo "  https://supabase.com/dashboard/project/_/sql"
  echo ""
  exit 1
else
  echo ""
  ok "Semua migrasi berhasil! Database siap digunakan."
  echo ""
  echo -e "${BOLD}Langkah berikutnya (opsional):${NC}"
  echo "  Jalankan seed admin (edit UUID dulu):"
  echo "  psql \"\$DATABASE_URL\" -f seeds/seed_admin.sql"
  echo ""
fi
