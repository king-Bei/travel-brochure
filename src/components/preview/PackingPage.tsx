import React from 'react';
import { useBrochure } from '../../context/BrochureContext';
import { CheckSquare } from 'lucide-react';
import { PageWrapper } from './PageWrapper';

export function PackingPage() {
  const { data } = useBrochure();

  const sections = [
    {
      title: 'IMPORTANT',
      fullWidth: true,
      items: ['護照、身分證', '信用卡、外幣', '筆']
    },
    {
      title: 'CLOTHING',
      items: ['盥洗衣物', '毛巾', '太陽眼鏡', '內衣褲', '鞋子', '帽子', '睡衣', '拖鞋', '薄外套', '泳衣']
    },
    {
      title: 'OTHERS',
      items: ['隨身包包', '洗衣袋、塑膠袋', '數字鎖頭', '行李秤', '其他：']
    },
    {
      title: 'CARRY-ON',
      items: ['眼罩、耳塞、頸枕', '口罩', '面紙、濕紙巾', '酒精、乾洗手', '生理用品', '雨傘、輕便雨衣', '隨身藥品', '水壺、環保餐具']
    },
    {
      title: 'ELECTRONICS',
      items: ['手機 / 國際電話卡', '網卡 / Wifi分享器', '手機充電器', '行動電源', '耳機', '萬用插頭', '相機及其充電器', '相機記憶卡、備用電池', '自拍棒、腳架', '筆電 / 平板及其充電器']
    },
    {
      title: 'TOILETRIES',
      items: ['沐浴、洗髮、護髮', '隱眼、眼藥水', '牙刷、牙膏、牙線', '鏡子、梳子', '洗面乳', '防曬、防蚊液']
    },
    {
      title: 'SKIN CARES',
      items: ['卸妝品、化妝棉', '刮鬍刀、刮鬍泡', '保養品', '髮類造型品', '化妝品', '指甲剪、棉花棒', '身體乳液']
    }
  ];

  const CheckboxItem = ({ label, important = false, className = "" }: { label: string, important?: boolean, className?: string }) => (
    <div className={`flex items-center gap-1.5 h-4.5 ${className}`}>
      <div className={`w-3.5 h-3.5 rounded-sm border-[1.5px] flex-shrink-0 flex items-center justify-center ${important ? 'border-amber-400 bg-amber-50' : 'border-gray-300'}`}>
        {important && <div className="w-1 h-1 bg-amber-400 rounded-full" />}
      </div>
      <span className={`text-[11px] font-medium whitespace-nowrap leading-none ${important ? 'text-amber-700 font-bold flex items-center gap-1' : 'text-gray-700'}`}>
        {label}
        {important && <span className="text-[8px] bg-amber-100 text-amber-600 px-1 rounded-sm leading-none py-0.5 border border-amber-200 uppercase tracking-tighter">Urgent</span>}
      </span>
    </div>
  );

  const SectionTitle = ({ title }: { title: string }) => (
    <h3 className="text-[12px] font-black text-gray-900 tracking-wider mb-1 border-b border-gray-100 pb-0.5 uppercase">
      {title}
    </h3>
  );

  return (
    <PageWrapper title="旅遊物品核對表" icon={<CheckSquare size={24} />}>
      <div className="flex flex-col h-full py-0">
        {/* 頂部標語 */}
        <div className="border-b-2 border-gray-900 mb-1 pb-0">
          <p className="text-[14px] font-black tracking-tight text-gray-800 leading-none">
            僅供參考，可依個人需求調整清單，並勾選是否都帶齊喔！
          </p>
        </div>

        {/* 重要物品欄 (全寬) */}
        <div className="mb-1">
          <SectionTitle title="IMPORTANT" />
          <div className="flex gap-x-6">
            {sections[0].items.map((item, i) => (
              <CheckboxItem key={i} label={item} />
            ))}
          </div>
        </div>

        {/* 三欄配置 */}
        <div className="grid grid-cols-3 gap-x-4 flex-grow min-h-0 mt-3">
          {/* 第一欄 */}
          <div className="flex flex-col space-y-3">
            <div>
              <SectionTitle title="CLOTHING" />
              <div className="flex flex-col space-y-1">
                {sections[1].items.map((item, i) => <CheckboxItem key={i} label={item} />)}
              </div>
            </div>
            <div>
              <SectionTitle title="SKIN CARES" />
              <div className="flex flex-col space-y-1">
                {sections[6].items.map((item, i) => <CheckboxItem key={i} label={item} />)}
              </div>
            </div>
          </div>

          {/* 第二欄 */}
          <div className="flex flex-col space-y-3">
            <div>
              <SectionTitle title="TOILETRIES" />
              <div className="flex flex-col space-y-1">
                {sections[5].items.map((item, i) => <CheckboxItem key={i} label={item} />)}
              </div>
            </div>
            <div>
              <SectionTitle title="ELECTRONICS" />
              <div className="flex flex-col space-y-1">
                {sections[4].items.map((item, i) => <CheckboxItem key={i} label={item} />)}
              </div>
            </div>
          </div>

          {/* 第三欄 */}
          <div className="flex flex-col space-y-3">
            <div>
              <SectionTitle title="CARRY-ON" />
              <div className="flex flex-col space-y-1">
                {sections[3].items.map((item, i) => <CheckboxItem key={i} label={item} />)}
              </div>
            </div>
            <div>
              <SectionTitle title="OTHERS" />
              <div className="flex flex-col space-y-1">
                {sections[2].items.map((item, i) => (
                  <div key={i} className="flex flex-col gap-1">
                    <CheckboxItem label={item} />
                    {item === '其他：' && (
                      <div className="space-y-3 mt-1 px-1">
                        <div className="border-b border-gray-300 w-full h-[1px]" />
                        <div className="border-b border-gray-300 w-full h-[1px]" />
                        <div className="border-b border-gray-300 w-full h-[1px]" />
                        <div className="border-b border-gray-300 w-full h-[1px]" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 使用者新增的其餘項目 (如果有)，也用三欄呈現 */}
        {data.packingList && data.packingList.length > 0 && (
          <div className="mt-2">
            <SectionTitle title="ADDITIONAL ITEMS" />
            <div className="grid grid-cols-3 gap-x-4 gap-y-1">
              {data.packingList.map((item, idx) => (
                <CheckboxItem key={idx} label={item.text} important={item.important} />
              ))}
            </div>
          </div>
        )}

        {/* 底部提醒事項 */}
        <div className="mt-auto space-y-1 pt-2 border-t border-gray-100">
          <div className="flex items-start gap-1 text-[8.5px] text-gray-600 leading-[1.3] font-medium">
            <span className="text-gray-900">●</span>
            <span>刮鬍泡、噴霧水、萬用刀、螺絲起子、壓縮氣體、液體容器或刀具等，不得隨身攜帶。</span>
          </div>
          <div className="flex items-start gap-1 text-[8.5px] text-gray-600 leading-[1.3] font-medium">
            <span className="text-gray-900">●</span>
            <span>液體、膠狀物品及液化氣體，如果以容器裝妥且每樣不超過100毫升，可放入隨身行李中。</span>
          </div>
          <div className="flex items-start gap-1 text-[8.5px] text-red-500 leading-[1.3] font-medium">
            <span className="text-red-600">●</span>
            <span>鋰電池、打火機及行動電源，不可放入託運行李內，請隨身攜帶；含有鋰或鋰離子電池之電子裝 置，如手錶、計算機、照相機、手機、手提電腦及錄影錄影機等，須放置於手提行李中。</span>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
