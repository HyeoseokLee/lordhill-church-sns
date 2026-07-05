import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import toast from 'react-hot-toast';
import api from '../lib/api';

// CSV 금액 문자열을 숫자로 변환
function parseAmount(str) {
  if (!str) return 0;
  const cleaned = str.replace(/"/g, '').replace(/,/g, '').trim();
  const num = Number(cleaned);
  return isNaN(num) ? 0 : num;
}

// 숫자를 천 단위 콤마 포맷으로 변환
function formatNumber(num) {
  if (num === 0) return '0';
  return num.toLocaleString('ko-KR');
}

// CSV 한 줄을 필드 배열로 파싱
function parseCsvLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

// CSV 파싱
function parseCsv(text) {
  const lines = text
    .split('\n')
    .filter(line => line.trim() && line.replace(/,/g, '').trim());
  if (lines.length < 2) return { rows: [], rawDataCount: 0 };
  const dataLines = lines.slice(1);
  const rows = dataLines.map(line => {
    const fields = parseCsvLine(line);
    const withdrawal = parseAmount(fields[3]);
    const deposit = parseAmount(fields[4]);
    return {
      date: fields[1] || '',
      type: withdrawal > 0 ? '출금' : '입금',
      name: fields[2] || '',
      withdrawal,
      deposit,
      balance: parseAmount(fields[5]),
      note: fields[6] || '',
      memo: fields[7] || '',
      matchedParty: null,
      matchedCategory: null,
    };
  });
  return { rows, rawDataCount: dataLines.length };
}

// 잔액 정합성 검증
function verify(rows, rawDataCount) {
  if (rows.length < 2)
    return { ok: false, reason: '데이터가 부족합니다 (2행 미만)' };
  if (rows.length !== rawDataCount)
    return {
      ok: false,
      reason: `행수 불일치 (원본 ${rawDataCount}행, 파싱 ${rows.length}행)`,
    };
  for (let i = 0; i < rows.length - 1; i++) {
    const expected = rows[i + 1].balance + rows[i].deposit - rows[i].withdrawal;
    if (expected !== rows[i].balance)
      return {
        ok: false,
        reason: `${i + 1}행 잔액 불일치 (예상 ${formatNumber(expected)}, 실제 ${formatNumber(rows[i].balance)})`,
      };
  }
  return { ok: true, reason: '' };
}

// 입출금자 이름 매칭
function matchCounterparty(rawName, counterparties) {
  if (!rawName) return null;
  const sorted = [...counterparties].sort(
    (a, b) => b.name.length - a.name.length,
  );
  for (const cp of sorted) {
    if (rawName.indexOf(cp.name) !== -1) {
      return { id: cp.id, name: cp.name };
    }
  }
  return null;
}

// 전체 rows에 확정이름 매칭 (입금만)
function matchAllRows(rows, counterparties) {
  return rows.map(row => ({
    ...row,
    matchedParty:
      row.type === '입금' ? matchCounterparty(row.name, counterparties) : null,
  }));
}

// 울타리기금 등록 페이지
export default function FundRegisterPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [rows, setRows] = useState([]);
  const [fileName, setFileName] = useState('');
  const [verifyResult, setVerifyResult] = useState(null);
  const [counterparties, setCounterparties] = useState([]);
  const [categories, setCategories] = useState([]);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState(null);
  const [invalidRows, setInvalidRows] = useState(new Set());
  const [dupModalOpen, setDupModalOpen] = useState(false);

  useEffect(() => {
    api
      .get('/admin/counterparties')
      .then(({ data }) => setCounterparties(data))
      .catch(console.error);
    api
      .get('/admin/transaction-categories')
      .then(({ data }) => setCategories(data))
      .catch(console.error);
  }, []);

  const handleFileChange = e => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setParsing(true);
    setRows([]);
    setVerifyResult(null);
    const reader = new FileReader();
    reader.onload = event => {
      const text = event.target?.result;
      if (typeof text === 'string') {
        requestAnimationFrame(() =>
          setTimeout(() => {
            const { rows: parsed, rawDataCount } = parseCsv(text);
            const matched = matchAllRows(parsed, counterparties);
            setRows(matched);
            setVerifyResult(verify(parsed, rawDataCount));
            setParsing(false);
          }, 50),
        );
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handlePartyChange = (idx, newValue) => {
    setRows(prev =>
      prev.map((row, i) =>
        i === idx
          ? {
              ...row,
              matchedParty: newValue
                ? { id: newValue.id, name: newValue.name }
                : null,
            }
          : row,
      ),
    );
  };

  // 특정 행의 카테고리 변경
  const handleCategoryChange = (idx, newValue) => {
    setRows(prev =>
      prev.map((row, i) =>
        i === idx
          ? {
              ...row,
              matchedCategory: newValue
                ? { id: newValue.id, name: newValue.name }
                : null,
            }
          : row,
      ),
    );
  };

  // 행의 입/출금 타입에 맞는 카테고리 옵션만 반환
  const getCategoryOptions = type =>
    categories.filter(c => c.type === (type === '입금' ? 'income' : 'expense'));

  const handleSave = async () => {
    if (!verifyResult?.ok) {
      alert('검증이 완료되지 않은 데이터는 저장할 수 없습니다.');
      return;
    }
    if (saving) return;

    // 입금 → 확정이름 필수
    const missing = new Set();
    const missingParty = [];
    rows.forEach((row, idx) => {
      if (row.type === '입금' && !row.matchedParty) {
        missing.add(idx);
        missingParty.push(idx + 1);
      }
    });
    if (missing.size > 0) {
      setInvalidRows(missing);
      alert(`확정이름 미선택 (입금): ${missingParty.join(', ')}행`);
      return;
    }
    setInvalidRows(new Set());

    setSaving(true);
    setSaveResult(null);
    try {
      const payload = rows.map(row => ({
        transactionDate: row.date,
        type: row.type === '입금' ? 'income' : 'expense',
        rawName: row.name,
        counterpartyId: row.matchedParty?.id || null,
        withdrawal: row.withdrawal,
        deposit: row.deposit,
        balance: row.balance,
        note: row.note,
        memo: row.memo,
        categoryId: row.matchedCategory?.id || null,
      }));
      const { data } = await api.post('/admin/fund-transactions/bulk', {
        rows: payload,
      });
      setSaveResult(data);
      if (data.skipped > 0) {
        setDupModalOpen(true);
      }
      if (data.inserted > 0) {
        toast.success(`${data.inserted}건 저장 완료`);
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || '저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/offering')}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            ← 뒤로
          </button>
          <h2 className="text-xl font-bold">울타리기금 등록</h2>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition"
        >
          파일 첨부
        </button>
        {fileName && <span className="text-sm text-gray-500">{fileName}</span>}
        {verifyResult?.ok && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-600 border border-blue-200">
            ✓ 검증완료
          </span>
        )}
        {verifyResult && !verifyResult.ok && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-600 border border-red-200">
            ✗ {verifyResult.reason}
          </span>
        )}
      </div>

      {parsing && (
        <div className="flex items-center justify-center gap-3 py-16">
          <CircularProgress size={24} />
          <span className="text-sm text-gray-500">파싱 및 매칭 중...</span>
        </div>
      )}

      {!parsing && rows.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 whitespace-nowrap">
                    입/출금
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 whitespace-nowrap">
                    거래일시
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 whitespace-nowrap">
                    보낸분/받는분
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 whitespace-nowrap">
                    확정이름
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500 whitespace-nowrap">
                    출금액(원)
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500 whitespace-nowrap">
                    입금액(원)
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500 whitespace-nowrap">
                    잔액(원)
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 whitespace-nowrap">
                    내 통장 표시
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 whitespace-nowrap">
                    메모
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 whitespace-nowrap">
                    카테고리
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr
                    key={idx}
                    className="border-b last:border-0 hover:bg-gray-50"
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                          row.type === '출금'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {row.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {row.date}
                    </td>
                    <td className="px-4 py-3 font-medium whitespace-nowrap">
                      {row.name}
                    </td>
                    <td className="px-2 py-1 whitespace-nowrap">
                      <Autocomplete
                        size="small"
                        options={counterparties}
                        getOptionLabel={opt => opt.name || ''}
                        value={
                          row.matchedParty
                            ? counterparties.find(
                                cp => cp.id === row.matchedParty.id,
                              ) || null
                            : null
                        }
                        onChange={(_, newVal) => handlePartyChange(idx, newVal)}
                        isOptionEqualToValue={(opt, val) => opt.id === val.id}
                        renderInput={params => (
                          <TextField
                            {...params}
                            variant="outlined"
                            size="small"
                            placeholder="선택"
                            error={
                              invalidRows.has(idx) &&
                              row.type === '입금' &&
                              !row.matchedParty
                            }
                          />
                        )}
                        sx={{ minWidth: 140 }}
                      />
                    </td>
                    <td className="px-4 py-3 text-right text-red-600 whitespace-nowrap">
                      {row.withdrawal > 0 ? formatNumber(row.withdrawal) : '-'}
                    </td>
                    <td className="px-4 py-3 text-right text-blue-600 whitespace-nowrap">
                      {row.deposit > 0 ? formatNumber(row.deposit) : '-'}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600 whitespace-nowrap">
                      {formatNumber(row.balance)}
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {row.note || '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {row.memo || '-'}
                    </td>
                    <td className="px-2 py-1 whitespace-nowrap">
                      <Autocomplete
                        size="small"
                        options={getCategoryOptions(row.type)}
                        getOptionLabel={opt => opt.name || ''}
                        value={
                          row.matchedCategory
                            ? categories.find(
                                c => c.id === row.matchedCategory.id,
                              ) || null
                            : null
                        }
                        onChange={(_, newVal) =>
                          handleCategoryChange(idx, newVal)
                        }
                        isOptionEqualToValue={(opt, val) => opt.id === val.id}
                        renderInput={params => (
                          <TextField
                            {...params}
                            variant="outlined"
                            size="small"
                            placeholder="선택"
                          />
                        )}
                        sx={{ minWidth: 130 }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-gray-50 px-4 py-3 border-t text-sm text-gray-500 flex items-center justify-between">
            <span>
              총 {rows.length}건 · 이름매칭{' '}
              {rows.filter(r => r.matchedParty).length}건 · 카테고리매칭{' '}
              {rows.filter(r => r.matchedCategory).length}건
              {saveResult && (
                <span className="ml-3 text-blue-600 font-medium">
                  → {saveResult.inserted}건 저장, {saveResult.skipped}건 중복
                  제외
                </span>
              )}
            </span>
            <button
              onClick={handleSave}
              disabled={saving || !verifyResult?.ok}
              className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>
      )}

      <Dialog
        open={dupModalOpen}
        onClose={() => setDupModalOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>중복 데이터 안내</DialogTitle>
        <DialogContent>
          {saveResult && (
            <>
              <p className="text-sm text-gray-600 mb-3">
                {saveResult.inserted > 0
                  ? `${saveResult.inserted}건 저장, ${saveResult.skipped}건은 이미 등록된 데이터와 중복되어 제외되었습니다.`
                  : `${saveResult.skipped}건 모두 이미 등록된 데이터와 중복되어 저장되지 않았습니다.`}
              </p>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium text-gray-500">
                        거래일시
                      </th>
                      <th className="text-left px-3 py-2 font-medium text-gray-500">
                        보낸분/받는분
                      </th>
                      <th className="text-right px-3 py-2 font-medium text-gray-500">
                        출금액
                      </th>
                      <th className="text-right px-3 py-2 font-medium text-gray-500">
                        입금액
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {saveResult.skippedRows.map((row, idx) => (
                      <tr
                        key={idx}
                        className="border-b last:border-0 hover:bg-gray-50"
                      >
                        <td className="px-3 py-2 text-gray-600 whitespace-nowrap">
                          {row.transactionDate}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {row.rawName || '-'}
                        </td>
                        <td className="px-3 py-2 text-right text-red-600 whitespace-nowrap">
                          {row.withdrawal > 0
                            ? row.withdrawal.toLocaleString('ko-KR')
                            : '-'}
                        </td>
                        <td className="px-3 py-2 text-right text-blue-600 whitespace-nowrap">
                          {row.deposit > 0
                            ? row.deposit.toLocaleString('ko-KR')
                            : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <button
            onClick={() => setDupModalOpen(false)}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition"
          >
            확인
          </button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
