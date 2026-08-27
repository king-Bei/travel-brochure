import React, { useCallback, useState, useEffect } from 'react';
import { useBrochure } from '../../context/BrochureContext';
import { Camera, ImagePlus, Trash2, Plus, LayoutPanelTop, Globe, Download, UploadCloud, X, ChevronUp, ChevronDown } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { attractionApi, Country, LibraryAttraction } from '../../lib/attractionApi';
import { compressImage } from '../../lib/imageUtils';
import { SectionSettings } from './SectionSettings';

export function AttractionForm() {
    const { data, updateData } = useBrochure();

    // Country & Library State
    const [countries, setCountries] = useState<Country[]>([]);
    const [selectedCountry, setSelectedCountry] = useState<string>('');
    const [countrySearch, setCountrySearch] = useState<string>('');
    const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
    const [isSavingIndex, setIsSavingIndex] = useState<number | null>(null);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [libraryAttractions, setLibraryAttractions] = useState<LibraryAttraction[]>([]);
    const [isLoadingLibrary, setIsLoadingLibrary] = useState(false);
    const [librarySearch, setLibrarySearch] = useState('');
    const [isSavingAll, setIsSavingAll] = useState(false);
    const [saveAllResult, setSaveAllResult] = useState<{ success: number; updated: number; skip: number } | null>(null);
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [countryLibrary, setCountryLibrary] = useState<LibraryAttraction[]>([]);
    const handleCountrySelect = (code: string) => {
        setSelectedCountry(code);
        const c = countries.find(x => x.code === code);
        if (c && data.attractions && data.attractions.length > 0) {
            const updated = data.attractions.map(a => ({
                ...a,
                country: c.name_zh
            }));
            updateData({ attractions: updated });
        }
    };

    useEffect(() => {
        attractionApi.fetchCountries().then(setCountries);
    }, []);

    useEffect(() => {
        if (selectedCountry) {
            attractionApi.fetchAttractionsByCountry(selectedCountry).then(setCountryLibrary);
        } else {
            setCountryLibrary([]);
        }
    }, [selectedCountry]);

    const fetchLibrary = async () => {
        if (!selectedCountry) return;
        setIsLoadingLibrary(true);
        const data = await attractionApi.fetchAttractionsByCountry(selectedCountry);
        setLibraryAttractions(data);
        setIsLoadingLibrary(false);
    };

    const handleSaveAllToLibrary = async () => {
        if (!selectedCountry) {
            alert('請先選擇國家，才能儲存至資料庫。');
            return;
        }
        const validAttractions = data.attractions.filter(a => a.title?.trim());
        if (validAttractions.length === 0) {
            alert('沒有可儲存的景點（需至少填寫景點名稱）。');
            return;
        }
        setIsSavingAll(true);
        setSaveAllResult(null);

        // 並行送出所有儲存請求（比起 for...of 串列等待快很多）
        const results = await Promise.all(
            validAttractions.map(a => attractionApi.saveAttractionToLibrary(selectedCountry, a))
        );

        let inserted = 0; let updated = 0; let skip = 0;
        for (const r of results) {
            if (r.status === 'inserted') inserted++;
            else if (r.status === 'updated') updated++;
            else skip++;
        }
        setIsSavingAll(false);
        setSaveAllResult({ success: inserted, updated, skip });
        setTimeout(() => setSaveAllResult(null), 5000);
        if (selectedCountry) {
            attractionApi.fetchAttractionsByCountry(selectedCountry).then(setCountryLibrary);
        }
    };

    const handleSaveToLibrary = async (index: number) => {
        if (!selectedCountry) {
            alert('請先在上方選擇國家，才能儲存至該國家的景點庫中。');
            return;
        }

        const attraction = data.attractions[index];
        if (!attraction.title) {
            alert('請至少填寫景點名稱再儲存。');
            return;
        }

        setIsSavingIndex(index);
        const result = await attractionApi.saveAttractionToLibrary(selectedCountry, attraction);
        setIsSavingIndex(null);

        if (result.status === 'inserted') {
            alert(`✅ 已新增「${attraction.title}」至資料庫！`);
            if (selectedCountry) {
                attractionApi.fetchAttractionsByCountry(selectedCountry).then(setCountryLibrary);
            }
        } else if (result.status === 'updated') {
            alert(`🔄 「${attraction.title}」已存在，資料已更新！`);
            if (selectedCountry) {
                attractionApi.fetchAttractionsByCountry(selectedCountry).then(setCountryLibrary);
            }
        } else {
            alert('儲存失敗，請確認 Supabase table 已建立，且圖片不超過 2MB。');
        }
    };

    const handleUpdateLibraryItem = async (item: LibraryAttraction) => {
        setUpdatingId(item.id);
        const ok = await attractionApi.updateAttractionInLibrary(item.id, item);
        setUpdatingId(null);
        if (ok) fetchLibrary();
    };

    const handleDeleteLibraryItem = async (id: string) => {
        if (!confirm('確定要從資料庫刪除這個景點嗎？')) return;
        setDeletingId(id);
        const ok = await attractionApi.deleteAttractionFromLibrary(id);
        setDeletingId(null);
        if (ok) {
            setLibraryAttractions(prev => prev.filter(a => a.id !== id));
            setCountryLibrary(prev => prev.filter(a => a.id !== id));
        }
    };

    const handleLoadFromLibrary = (libraryItem: LibraryAttraction) => {
        updateData({
            attractions: [
                ...(data.attractions || []),
                {
                    id: (libraryItem as any).id || crypto.randomUUID(),
                    title: libraryItem.title || '',
                    description: libraryItem.description || '',
                    images: libraryItem.images || [],
                    layout: (libraryItem.layout as "top-1-bottom-2" | "left-1-right-2" | "grid-4" | "single" | "side-left" | "side-right") || 'top-1-bottom-2',
                    country: countries.find(c => c.code === libraryItem.country_code)?.name_zh || '',
                },
            ],
        });
        setIsModalOpen(false);
    };

    const addAttraction = () => {
        const c = countries.find(x => x.code === selectedCountry);
        updateData({
            attractions: [
                ...(data.attractions || []),
                { 
                    id: crypto.randomUUID(), 
                    title: '', 
                    description: '', 
                    images: [], 
                    layout: 'top-1-bottom-2', 
                    isTwoPerPage: false, 
                    pageBreakAfter: false,
                    country: c ? c.name_zh : ''
                },
            ],
        });
    };

    const moveAttraction = (index: number, direction: 'up' | 'down') => {
        const newAttractions = [...data.attractions];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= newAttractions.length) return;
        [newAttractions[index], newAttractions[targetIndex]] = [newAttractions[targetIndex], newAttractions[index]];
        updateData({ attractions: newAttractions });
    };

    const removeAttraction = (index: number) => {
        const newAttractions = [...data.attractions];
        newAttractions.splice(index, 1);
        updateData({ attractions: newAttractions });
    };

    const updateAttraction = (index: number, field: string, value: any) => {
        const newAttractions = [...data.attractions];
        if (field === 'title') {
            const matched = countryLibrary.find(item => item.title === value);
            if (matched) {
                newAttractions[index] = {
                    ...newAttractions[index],
                    title: matched.title,
                    description: matched.description || '',
                    layout: (matched.layout as any) || 'top-1-bottom-2',
                    images: matched.images || [],
                };
            } else {
                newAttractions[index] = { ...newAttractions[index], [field]: value };
            }
        } else {
            newAttractions[index] = { ...newAttractions[index], [field]: value };
        }
        updateData({ attractions: newAttractions });
    };

    const handleImageUpload = async (attractionIndex: number, imageIndex: number | null, file: File) => {
        try {
            const compressedImage = await compressImage(file);
            const newAttractions = [...data.attractions];
            const attraction = newAttractions[attractionIndex];
            const newImages = [...attraction.images];

            if (imageIndex !== null && imageIndex < newImages.length) {
                newImages[imageIndex] = compressedImage;
            } else {
                newImages.push(compressedImage);
            }

            attraction.images = newImages;
            updateData({ attractions: newAttractions });
        } catch (error) {
            console.error('景點圖片壓縮失敗', error);
        }
    };

    const removeImage = (attractionIndex: number, imageIndex: number, e: React.MouseEvent) => {
        e.stopPropagation();
        const newAttractions = [...data.attractions];
        newAttractions[attractionIndex].images.splice(imageIndex, 1);
        updateData({ attractions: newAttractions });
    };

    const inputClassName = "w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all text-sm text-gray-700";
    const labelClassName = "block text-xs font-medium text-gray-700 mb-1.5";

    return (
        <div className="space-y-6 pb-20">
            <div className="flex justify-between items-center">
                <h3 className="font-semibold text-lg flex items-center gap-2" style={{ color: data.theme.primary }}>
                    <Camera size={20} />
                    景點介紹
                </h3>
                <div className="flex items-center gap-2 flex-wrap">
                    <button
                        onClick={() => {
                            if (!selectedCountry) {
                                alert('請先在下方選擇國家，才能從資料庫載入。');
                                return;
                            }
                            setIsModalOpen(true);
                            fetchLibrary();
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg transition-colors hover:bg-gray-50 shadow-sm"
                    >
                        <Download size={16} />
                        從資料庫載入
                    </button>
                    <button
                        onClick={handleSaveAllToLibrary}
                        disabled={isSavingAll}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg transition-colors hover:bg-emerald-100 shadow-sm disabled:opacity-60"
                    >
                        <UploadCloud size={16} />
                        {isSavingAll ? '儲存中...' : '全部存入資料庫'}
                    </button>
                    <button
                        onClick={addAttraction}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white rounded-lg transition-colors shadow-sm"
                        style={{ backgroundColor: data.theme.primary }}
                    >
                        <Plus size={16} />
                        新增景點空表單
                    </button>
                    {saveAllResult && (
                        <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 rounded-lg">
                            {saveAllResult.success > 0 && `✅ 新增 ${saveAllResult.success} 筆 `}
                            {saveAllResult.updated > 0 && `🔄 更新 ${saveAllResult.updated} 筆 `}
                            {saveAllResult.skip > 0 && `❌ 失敗 ${saveAllResult.skip} 筆`}
                        </span>
                    )}
                </div>
            </div>

            <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl flex items-center gap-3">
                <Globe size={20} className="text-blue-500 flex-shrink-0" />
                <div className="flex-1 flex items-end gap-3">
                    <div className="flex-1">
                        <label className={`${labelClassName} text-blue-800`}>手冊關聯國家 (寫入資料庫或載入景點用的分類)</label>
                        <div className="relative mt-1">
                            <div className="flex gap-2 items-center">
                                {/* 代碼快速輸入 */}
                                <input
                                    type="text"
                                    value={countrySearch}
                                    onChange={(e) => {
                                        const val = e.target.value.toUpperCase();
                                        setCountrySearch(e.target.value);
                                        setIsCountryDropdownOpen(true);
                                        // 若直接打出完整代碼（2碼），自動選取
                                        const exactMatch = countries.find(c => c.code === val);
                                        if (exactMatch) {
                                            handleCountrySelect(exactMatch.code);
                                        }
                                    }}
                                    onFocus={() => setIsCountryDropdownOpen(true)}
                                    onBlur={() => setTimeout(() => setIsCountryDropdownOpen(false), 150)}
                                    placeholder="輸入代碼 (JP) 或名稱 (日本) 搜尋..."
                                    className={`${inputClassName} border-blue-200 focus:ring-blue-200 flex-1`}
                                />
                                {/* 已選國家顯示 */}
                                {selectedCountry && (() => {
                                    const c = countries.find(x => x.code === selectedCountry);
                                    return c ? (
                                        <span className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg whitespace-nowrap shadow-sm">
                                            <span className="opacity-80 text-xs">{c.code}</span>
                                            {c.name_zh}
                                        </span>
                                    ) : null;
                                })()}
                            </div>

                            {/* 下拉搜尋結果 */}
                            {isCountryDropdownOpen && (
                                <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-blue-200 rounded-xl shadow-xl max-h-56 overflow-y-auto custom-scrollbar">
                                    {(() => {
                                        const q = countrySearch.trim().toLowerCase();
                                        const filtered = q
                                            ? countries.filter(c =>
                                                c.code.toLowerCase().includes(q) ||
                                                c.name_zh.includes(countrySearch) ||
                                                c.name_en.toLowerCase().includes(q)
                                            )
                                            : countries;
                                        return filtered.length > 0 ? (
                                            filtered.map(c => (
                                                <button
                                                    key={c.code}
                                                    type="button"
                                                    onMouseDown={() => {
                                                        handleCountrySelect(c.code);
                                                        setCountrySearch('');
                                                        setIsCountryDropdownOpen(false);
                                                    }}
                                                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-blue-50 transition-colors ${selectedCountry === c.code ? 'bg-blue-50 font-bold text-blue-700' : 'text-gray-700'}`}
                                                >
                                                    <span className="w-10 text-xs font-black text-blue-500 bg-blue-50 rounded px-1 py-0.5 text-center flex-shrink-0">{c.code}</span>
                                                    <span className="text-sm">{c.name_zh}</span>
                                                    <span className="text-xs text-gray-400 ml-auto">{c.name_en}</span>
                                                </button>
                                            ))
                                        ) : (
                                            <div className="px-4 py-3 text-sm text-gray-400 text-center">找不到符合的國家</div>
                                        );
                                    })()}
                                </div>
                            )}
                        </div>
                    </div>
                    {countries.length === 0 && (
                        <button
                            onClick={async () => {
                                const confirmSync = window.confirm("資料庫目前沒有國家資料，是否要寫入預設的各國資料 (Relational Data)？");
                                if (!confirmSync) return;
                                // 略過的 SQL 匯入邏輯：這裡直接傳入一些主要國家，或者可以根據 SQL 檔案傳入
                                const defaultList: Country[] = [
                                    { code: 'JP', name_en: 'Japan', name_zh: '日本' },
                                    { code: 'MY', name_en: 'Malaysia', name_zh: '馬來西亞' },
                                    { code: 'TH', name_en: 'Thailand', name_zh: '泰國' },
                                    { code: 'TW', name_en: 'Taiwan', name_zh: '台灣' },
                                    { code: 'KR', name_en: 'Korea (Rep)', name_zh: '韓國' },
                                    { code: 'VN', name_en: 'Vietnam', name_zh: '越南' },
                                ];
                                const success = await attractionApi.syncCountries(defaultList);
                                if (success) {
                                    alert('基礎國家資料寫入成功！請重新整理以讀取清單。');
                                    attractionApi.fetchCountries().then(setCountries);
                                } else {
                                    alert('寫入失敗');
                                }
                            }}
                            className="px-3 py-2 text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition shadow-md whitespace-nowrap"
                        >
                            同步國家清單
                        </button>
                    )}
                </div>
            </div>

            <div className="space-y-6">
                {data.attractions?.map((attraction, index) => {
                    return (
                        <div key={index} className="p-5 bg-white border border-gray-200 rounded-xl shadow-sm relative overflow-hidden group">
                            <div
                                className="absolute top-0 left-0 w-1 h-full"
                                style={{ backgroundColor: data.theme.primary }}
                            />

                            <div className="absolute top-3 right-3 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => moveAttraction(index, 'up')}
                                    disabled={index === 0}
                                    className="p-1.5 text-gray-400 hover:text-blue-600 disabled:opacity-20"
                                    title="上移"
                                >
                                    <ChevronUp size={18} />
                                </button>
                                <button
                                    onClick={() => moveAttraction(index, 'down')}
                                    disabled={index === data.attractions.length - 1}
                                    className="p-1.5 text-gray-400 hover:text-blue-600 disabled:opacity-20"
                                    title="下移"
                                >
                                    <ChevronDown size={18} />
                                </button>
                                <div className="w-[1px] h-4 bg-gray-200 mx-1" />
                                <button
                                    onClick={() => handleSaveToLibrary(index)}
                                    disabled={isSavingIndex === index}
                                    className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${isSavingIndex === index
                                        ? 'bg-blue-50 text-blue-400 cursor-not-allowed'
                                        : 'text-blue-600 bg-blue-50 hover:bg-blue-100'
                                        }`}
                                    title="儲存至圖庫"
                                >
                                    <UploadCloud size={14} />
                                    {isSavingIndex === index ? '中...' : '儲存'}
                                </button>

                                <button
                                    onClick={() => removeAttraction(index)}
                                    className="p-1.5 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                    title="移除"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>

                            <SectionSettings id={attraction.id} />

                            <div className="grid grid-cols-[1fr_200px] gap-6 pl-2 mt-4">
                                <div className="space-y-4">
                                    <div>
                                        <label className={labelClassName}>景點名稱 (可輸入關鍵字自動帶入舊景點資料與圖片)</label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                list={`attraction-title-list-${index}`}
                                                value={attraction.title}
                                                onChange={(e) => updateAttraction(index, 'title', e.target.value)}
                                                className={inputClassName}
                                                placeholder="輸入關鍵字搜尋或選擇之前存過的景點..."
                                            />
                                            <datalist id={`attraction-title-list-${index}`}>
                                                {countryLibrary.map(item => (
                                                    <option key={item.id} value={item.title}>
                                                        {item.description ? `${item.description.slice(0, 30)}...` : '無描述'}
                                                    </option>
                                                ))}
                                            </datalist>
                                        </div>
                                    </div>
                                    <div>
                                        <label className={labelClassName}>景點介紹 (支援多國語言或詳細描述)</label>
                                        <textarea
                                            value={attraction.description}
                                            onChange={(e) => updateAttraction(index, 'description', e.target.value)}
                                            className={`${inputClassName} h-24 resize-none`}
                                            placeholder="輸入景點的詳細介紹..."
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        <div>
                                            <label className={labelClassName}>版面配置</label>
                                            <select
                                                value={attraction.layout}
                                                onChange={(e) => updateAttraction(index, 'layout', e.target.value)}
                                                className={inputClassName}
                                            >
                                                <option value="top-1-bottom-2">上大圖 x1 + 下小圖 x2</option>
                                                <option value="left-1-right-2">左大圖 x1 + 右小圖 x2</option>
                                                <option value="grid-4">四宮格等比</option>
                                                <option value="single">滿版單圖</option>
                                                <option value="side-left">左圖右文 (圖小文多)</option>
                                                <option value="side-right">左文右圖 (圖小文多)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className={labelClassName}>圖片/地圖大小</label>
                                            <select
                                                value={attraction.imageScale ?? 1.0}
                                                onChange={(e) => updateAttraction(index, 'imageScale', parseFloat(e.target.value))}
                                                className={inputClassName}
                                            >
                                                <option value="0.8">80% (精簡)</option>
                                                <option value="1.0">100% (標準預設)</option>
                                                <option value="1.2">120% (放大)</option>
                                                <option value="1.5">150% (大型大圖)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className={labelClassName}>所在國家</label>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    list={`country-list-${index}`}
                                                    value={attraction.country || ''}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        // 若輸入的是代碼（2碼大寫），自動轉為中文國名
                                                        const matchByCode = countries.find(c => c.code === val.toUpperCase());
                                                        if (matchByCode) {
                                                            updateAttraction(index, 'country', matchByCode.name_zh);
                                                        } else {
                                                            updateAttraction(index, 'country', val);
                                                        }
                                                    }}
                                                    className={inputClassName}
                                                    placeholder="輸入代碼 (JP) 或名稱 (日本) 搜尋..."
                                                />
                                                <datalist id={`country-list-${index}`}>
                                                    {countries.map(c => (
                                                        <option key={c.code} value={c.name_zh}>
                                                            {c.code} - {c.name_en}
                                                        </option>
                                                    ))}
                                                </datalist>
                                            </div>
                                        </div>
                                    </div>


                                    <div className="flex items-center gap-6 pt-2">
                                        <label className="flex items-center gap-2 cursor-pointer group">
                                            <input
                                                type="checkbox"
                                                checked={attraction.isTwoPerPage || false}
                                                onChange={(e) => updateAttraction(index, 'isTwoPerPage', e.target.checked)}
                                                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                            />
                                            <span className="text-sm font-medium text-gray-700 group-hover:text-blue-600 transition-colors">一頁顯示兩個景點</span>
                                        </label>

                                        <label className="flex items-center gap-2 cursor-pointer group">
                                            <input
                                                type="checkbox"
                                                checked={attraction.pageBreakAfter || false}
                                                onChange={(e) => updateAttraction(index, 'pageBreakAfter', e.target.checked)}
                                                className="w-4 h-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                                            />
                                            <span className="text-sm font-medium text-gray-700 group-hover:text-orange-600 transition-colors">此景點後強制換頁</span>
                                        </label>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className={labelClassName}>圖片上傳</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {/* 已上傳圖片 */}
                                        {attraction.images.map((img, imgIndex) => (
                                            <div key={imgIndex} className="relative aspect-square rounded-lg border border-gray-200 overflow-hidden group/img">
                                                <img src={img} alt="" className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                                                    <button
                                                        onClick={(e) => removeImage(index, imgIndex, e)}
                                                        className="bg-white/90 text-red-500 rounded-full p-1.5 shadow-sm hover:scale-110 transition-transform"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}

                                        {/* 上傳按鈕 */}
                                        {attraction.images.length < 4 && (
                                            <ImageUploader
                                                onUpload={(file) => handleImageUpload(index, null, file)}
                                            />
                                        )}
                                    </div>
                                    <p className="text-[10px] text-gray-400 text-center mt-2">
                                        最多上傳 4 張圖片。拖曳或點擊。
                                    </p>
                                </div>
                            </div>
                        </div>
                    );
                })}

                {data.attractions?.length > 0 && (
                    <div className="flex justify-center pt-4">
                        <button
                            onClick={addAttraction}
                            className="flex items-center gap-2 px-6 py-3 bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl text-gray-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all font-bold"
                        >
                            <Plus size={20} />
                            新增下一個景點
                        </button>
                    </div>
                )}

                {(!data.attractions || data.attractions.length === 0) && (
                    <div className="text-center py-10 bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl">
                        <Camera size={40} className="mx-auto text-gray-300 mb-3" />
                        <p className="text-gray-500 text-sm">目前沒有景點介紹</p>
                        <button
                            onClick={addAttraction}
                            className="mt-3 text-sm font-medium text-blue-600 hover:text-blue-700"
                        >
                            + 新增景點
                        </button>
                    </div>
                )}
            </div>
            {/* Library Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[80vh] flex flex-col overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                            <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                                <Globe className="text-blue-500" size={20} />
                                選擇要載入的景點
                                {selectedCountry && <span className="text-sm font-normal text-gray-500 bg-white px-2 py-0.5 rounded-full border">
                                    此為 {countries.find(c => c.code === selectedCountry)?.name_zh} 的圖庫
                                </span>}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100">
                                <X size={20} />
                            </button>
                        </div>

                        {/* 搜尋列 */}
                        <div className="px-6 py-3 border-b border-gray-100 bg-white">
                            <input
                                type="text"
                                value={librarySearch}
                                onChange={(e) => setLibrarySearch(e.target.value)}
                                placeholder="搜尋景點名稱或描述..."
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all"
                            />
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                            {isLoadingLibrary ? (
                                <div className="py-20 text-center">
                                    <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
                                    <p className="text-gray-500 font-medium">載入資料庫中...</p>
                                </div>
                            ) : libraryAttractions.length === 0 ? (
                                <div className="py-20 text-center bg-white rounded-xl border border-dashed border-gray-200">
                                    <Camera size={40} className="mx-auto text-gray-300 mb-3" />
                                    <p className="text-gray-500 font-medium">這個國家還沒有儲存任何景點</p>
                                    <p className="text-gray-400 text-sm mt-1">您可以先在下方編輯後儲存至資料庫，下次就可以在這裡看到了！</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {libraryAttractions
                                        .filter(item => {
                                            const q = librarySearch.trim().toLowerCase();
                                            if (!q) return true;
                                            return item.title.toLowerCase().includes(q) || item.description?.toLowerCase().includes(q);
                                        })
                                        .map((item) => (
                                            <div key={item.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:border-blue-300 transition-colors group cursor-default shadow-sm hover:shadow-md flex flex-col h-full">
                                                {item.images && item.images.length > 0 ? (
                                                    <div className="h-32 w-full bg-gray-100 relative">
                                                        <img src={item.images[0]} alt={item.title} className="w-full h-full object-cover" />
                                                        <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                                                        <span className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-md font-medium">
                                                            {item.images.length} 張圖
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <div className="h-32 w-full bg-gray-50 flex items-center justify-center text-gray-300">
                                                        <ImagePlus size={32} />
                                                    </div>
                                                )}

                                                <div className="p-4 flex-1 flex flex-col">
                                                    <h4 className="font-bold text-gray-900 mb-1">{item.title}</h4>
                                                    <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed flex-1">
                                                        {item.description || '無描述'}
                                                    </p>

                                                    {/* 載入 */}
                                                    <button
                                                        onClick={() => handleLoadFromLibrary(item)}
                                                        className="w-full mt-3 py-2 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                                                    >
                                                        <Download size={16} />
                                                        載入此景點
                                                    </button>

                                                    {/* 更新 / 刪除 */}
                                                    <div className="flex gap-2 mt-2">
                                                        <button
                                                            onClick={() => handleUpdateLibraryItem(item)}
                                                            disabled={updatingId === item.id}
                                                            className="flex-1 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100 rounded-lg transition-colors flex items-center justify-center gap-1 disabled:opacity-60"
                                                        >
                                                            <UploadCloud size={13} />
                                                            {updatingId === item.id ? '更新中...' : '更新至資料庫'}
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteLibraryItem(item.id)}
                                                            disabled={deletingId === item.id}
                                                            className="py-1.5 px-3 text-xs font-medium text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 rounded-lg transition-colors flex items-center justify-center gap-1 disabled:opacity-60"
                                                        >
                                                            <Trash2 size={13} />
                                                            {deletingId === item.id ? '...' : '刪除'}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function ImageUploader({ onUpload }: { onUpload: (file: File) => void }) {
    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles[0]) {
            onUpload(acceptedFiles[0]);
        }
    }, [onUpload]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] },
        maxFiles: 1
    });

    return (
        <div
            {...getRootProps()}
            tabIndex={0}
            onPaste={(e) => {
                const items = e.clipboardData.items;
                for (let i = 0; i < items.length; i++) {
                    if (items[i].type.startsWith('image/')) {
                        const file = items[i].getAsFile();
                        if (file) { onUpload(file); e.preventDefault(); break; }
                    }
                }
            }}
            className={`aspect-square relative border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer transition-colors outline-none focus:border-blue-300 ${isDragActive ? 'border-blue-400 bg-blue-50/50' : 'border-gray-300 hover:bg-gray-50'
                }`}
        >
            <input {...getInputProps()} />
            <ImagePlus size={20} className={isDragActive ? 'text-blue-500' : 'text-gray-400'} />
            <span className="text-[9px] text-gray-400 mt-1 text-center leading-tight">貼上</span>
        </div>
    );
}
