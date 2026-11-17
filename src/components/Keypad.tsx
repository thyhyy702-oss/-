import React from 'react';
import { ShiftModifier } from '../types/calculator';

export type KeyActionId =
  | 'SHIFT' | 'ALPHA' | 'MODE' | '2ND'
  | 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'CENTER'
  | 'CALC' | 'INT' | 'INV' | 'LOGXY'
  | 'FRAC' | 'SQRT' | 'SQ' | 'POW' | 'LOG' | 'LN'
  | 'NEG' | 'DMS' | 'HYP' | 'SIN' | 'COS' | 'TAN'
  | 'RCL' | 'ENG' | 'LPAREN' | 'RPAREN' | 'SD' | 'MPLUS'
  | 'N7' | 'N8' | 'N9' | 'DEL' | 'AC'
  | 'N4' | 'N5' | 'N6' | 'MUL' | 'DIV'
  | 'N1' | 'N2' | 'N3' | 'ADD' | 'SUB'
  | 'N0' | 'DOT' | 'EXP' | 'ANS' | 'EQ';

interface KeypadProps {
  shift: ShiftModifier;
  is2nd: boolean;
  stoPending: boolean;
  onKeyPress: (id: KeyActionId) => void;
  buttonToneClass?: string;
}

interface SubLabels {
  gold?: React.ReactNode;
  purple?: React.ReactNode;
}

const SubHeader: React.FC<SubLabels & { shift: ShiftModifier }> = ({
  gold,
  purple,
  shift,
}) => {
  return (
    <div className="flex items-center justify-between px-1 h-[15px] leading-none text-[10px] sm:text-[11px] font-semibold tracking-tight select-none">
      <span
        className={`text-[#F8C42C] whitespace-nowrap transition-opacity ${
          shift === 'SHIFT' ? 'opacity-100 drop-shadow-[0_0_4px_rgba(248,196,44,0.6)]' : 'opacity-95'
        } ${!purple ? 'mx-auto' : ''}`}
      >
        {gold}
      </span>
      {purple && (
        <span
          className={`text-[#9D85E8] whitespace-nowrap transition-opacity ${
            shift === 'ALPHA' ? 'opacity-100 drop-shadow-[0_0_4px_rgba(157,133,232,0.7)]' : 'opacity-95'
          } ${!gold ? 'mx-auto' : ''}`}
        >
          {purple}
        </span>
      )}
    </div>
  );
};

export const Keypad: React.FC<KeypadProps> = ({
  shift,
  is2nd,
  stoPending,
  onKeyPress,
  buttonToneClass = 'bg-[#343537] hover:bg-[#3F4043] text-white border-[#48494C]',
}) => {
  const sciBtnBase =
    `calc-key w-full h-[36px] sm:h-[40px] rounded-[7px] border-t border-white/10 shadow-[0_2px_0_rgba(0,0,0,0.45)] active:shadow-[0_1px_0_rgba(0,0,0,0.4)] flex items-center justify-center font-medium text-[15px] sm:text-[16px] cursor-pointer ${buttonToneClass}`;

  const numBtnBase =
    'calc-key w-full h-[44px] sm:h-[48px] rounded-[8px] border-t border-white/10 shadow-[0_2px_0_rgba(0,0,0,0.5)] active:shadow-[0_1px_0_rgba(0,0,0,0.45)] bg-[#353638] hover:bg-[#414245] text-white flex items-center justify-center font-medium text-[22px] sm:text-[24px] cursor-pointer font-calc-mono';

  return (
    <div className="flex flex-col gap-[5px] sm:gap-[6px] px-1.5 sm:px-2 pb-2 select-none">
      {/* TOP BLOCK: SHIFT, ALPHA, D-PAD (2x2), MODE, 2nd + Row 2 */}
      <div className="grid grid-cols-6 gap-x-[5px] sm:gap-x-[6px] gap-y-[4px] items-end">
        {/* Col 1, Row 1: SHIFT */}
        <div className="flex flex-col">
          <button
            type="button"
            onClick={() => onKeyPress('SHIFT')}
            className={`calc-key w-full h-[34px] sm:h-[38px] rounded-[7px] bg-[#FFC928] hover:bg-[#FFD34D] text-[#141517] font-bold text-[13px] sm:text-[14px] tracking-wide shadow-[0_2px_0_rgba(0,0,0,0.45)] active:shadow-[0_1px_0_rgba(0,0,0,0.4)] cursor-pointer flex items-center justify-center ${
              shift === 'SHIFT' ? 'ring-2 ring-white' : ''
            }`}
          >
            SHIFT
          </button>
        </div>

        {/* Col 2, Row 1: ALPHA */}
        <div className="flex flex-col">
          <button
            type="button"
            onClick={() => onKeyPress('ALPHA')}
            className={`calc-key w-full h-[34px] sm:h-[38px] rounded-[7px] bg-[#967CE3] hover:bg-[#A68FEF] text-white font-semibold text-[13px] sm:text-[14px] tracking-wide shadow-[0_2px_0_rgba(0,0,0,0.45)] active:shadow-[0_1px_0_rgba(0,0,0,0.4)] cursor-pointer flex items-center justify-center ${
              shift === 'ALPHA' ? 'ring-2 ring-white' : ''
            }`}
          >
            ALPHA
          </button>
        </div>

        {/* Col 3-4, Rows 1-2: Oval D-Pad */}
        <div className="col-span-2 row-span-2 flex items-center justify-center self-stretch py-[2px]">
          <div className="relative w-full h-full min-h-[84px] sm:min-h-[92px] rounded-[46px] bg-gradient-to-b from-[#66676B] to-[#4A4B4E] border border-[#77787C]/60 shadow-[inset_0_1px_1px_rgba(255,255,255,0.25),0_3px_6px_rgba(0,0,0,0.5)] overflow-hidden">
            {/* Diagonal sector etched lines matching CalcES D-Pad */}
            <svg
              viewBox="0 0 100 60"
              preserveAspectRatio="none"
              className="absolute inset-0 w-full h-full pointer-events-none opacity-45"
            >
              <line x1="12" y1="6" x2="88" y2="54" stroke="#18191B" strokeWidth="1.2" />
              <line x1="88" y1="6" x2="12" y2="54" stroke="#18191B" strokeWidth="1.2" />
            </svg>

            {/* Up */}
            <button
              type="button"
              aria-label="Up"
              onClick={() => onKeyPress('UP')}
              className="calc-dpad-btn absolute top-0 left-1/2 -translate-x-1/2 w-[54%] h-[36%] flex items-start justify-center pt-1.5 text-[#D1D3D6] hover:text-white cursor-pointer"
            >
              <span className="text-[11px] leading-none">▲</span>
            </button>

            {/* Down */}
            <button
              type="button"
              aria-label="Down"
              onClick={() => onKeyPress('DOWN')}
              className="calc-dpad-btn absolute bottom-0 left-1/2 -translate-x-1/2 w-[54%] h-[36%] flex items-end justify-center pb-1.5 text-[#D1D3D6] hover:text-white cursor-pointer"
            >
              <span className="text-[11px] leading-none">▼</span>
            </button>

            {/* Left */}
            <button
              type="button"
              aria-label="Left"
              onClick={() => onKeyPress('LEFT')}
              className="calc-dpad-btn absolute left-0 top-1/2 -translate-y-1/2 w-[36%] h-[68%] flex items-center justify-start pl-2.5 text-[#D1D3D6] hover:text-white cursor-pointer"
            >
              <span className="text-[11px] leading-none">◄</span>
            </button>

            {/* Right */}
            <button
              type="button"
              aria-label="Right"
              onClick={() => onKeyPress('RIGHT')}
              className="calc-dpad-btn absolute right-0 top-1/2 -translate-y-1/2 w-[36%] h-[68%] flex items-center justify-end pr-2.5 text-[#D1D3D6] hover:text-white cursor-pointer"
            >
              <span className="text-[11px] leading-none">►</span>
            </button>

            {/* Center dot button */}
            <button
              type="button"
              aria-label="Evaluate or Select"
              onClick={() => onKeyPress('CENTER')}
              className="calc-dpad-btn absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[22px] h-[22px] rounded-full bg-[#151618] hover:bg-[#232529] border border-white/15 shadow-inner cursor-pointer"
            />
          </div>
        </div>

        {/* Col 5, Row 1: MODE */}
        <div className="flex flex-col">
          <button
            type="button"
            onClick={() => onKeyPress('MODE')}
            className={sciBtnBase + ' !h-[34px] sm:!h-[38px] !text-[13px] sm:!text-[14px]'}
          >
            MODE
          </button>
        </div>

        {/* Col 6, Row 1: 2nd */}
        <div className="flex flex-col">
          <button
            type="button"
            onClick={() => onKeyPress('2ND')}
            className={`${sciBtnBase} !h-[34px] sm:!h-[38px] italic !text-[15px] sm:!text-[16px] ${
              is2nd ? '!bg-[#5B4D8C] ring-2 ring-[#967CE3]' : ''
            }`}
          >
            2nd
          </button>
        </div>

        {/* Col 1, Row 2: CALC (SOLVE / =) */}
        <div className="flex flex-col">
          <SubHeader gold="SOLVE" purple="=" shift={shift} />
          <button type="button" onClick={() => onKeyPress('CALC')} className={sciBtnBase + ' !text-[13px] sm:!text-[14px]'}>
            CALC
          </button>
        </div>

        {/* Col 2, Row 2: ∫dx (d/dx / ;) */}
        <div className="flex flex-col">
          <SubHeader gold="d/dx" purple=";" shift={shift} />
          <button type="button" onClick={() => onKeyPress('INT')} className={sciBtnBase}>
            <span className="italic font-serif mr-0.5">∫</span>dx
          </button>
        </div>

        {/* Col 5, Row 2: x⁻¹ (x! / ><=) */}
        <div className="flex flex-col">
          <SubHeader gold="x!" purple="><=" shift={shift} />
          <button type="button" onClick={() => onKeyPress('INV')} className={sciBtnBase}>
            <span className="italic font-serif">x</span>
            <sup className="text-[10px] ml-[1px]">−1</sup>
          </button>
        </div>

        {/* Col 6, Row 2: Log_xy (Σ / Π) */}
        <div className="flex flex-col">
          <SubHeader gold="Σ" purple="Π" shift={shift} />
          <button type="button" onClick={() => onKeyPress('LOGXY')} className={sciBtnBase + ' !text-[13px] sm:!text-[14px]'}>
            <span>Log</span>
            <sub className="text-[10px] italic font-serif mx-[1px]">x</sub>
            <span className="italic font-serif">y</span>
          </button>
        </div>
      </div>

      {/* ROW 3 (6 columns): x/y, √x, x², xʸ, Log, Ln */}
      <div className="grid grid-cols-6 gap-[5px] sm:gap-[6px]">
        <div className="flex flex-col">
          <SubHeader
            gold={
              <span className="inline-flex items-center text-[9px]">
                <span className="italic">x</span>
                <span className="inline-flex flex-col leading-[0.8] ml-[1px] text-[7px]">
                  <span className="border-b border-[#F8C42C]">y</span>
                  <span>z</span>
                </span>
              </span>
            }
            purple="÷R"
            shift={shift}
          />
          <button type="button" onClick={() => onKeyPress('FRAC')} className={sciBtnBase}>
            <span className="inline-flex flex-col items-center leading-[0.95] text-[11px] italic font-serif">
              <span className="border-b border-white px-1">x</span>
              <span>y</span>
            </span>
          </button>
        </div>

        <div className="flex flex-col">
          <SubHeader gold="³√x" purple="mod" shift={shift} />
          <button type="button" onClick={() => onKeyPress('SQRT')} className={sciBtnBase}>
            <span className="font-serif">{is2nd ? '³√x' : '√x'}</span>
          </button>
        </div>

        <div className="flex flex-col">
          <SubHeader
            gold={
              <span>
                x<sup>3</sup>
              </span>
            }
            purple="CLR"
            shift={shift}
          />
          <button type="button" onClick={() => onKeyPress('SQ')} className={sciBtnBase}>
            <span className="italic font-serif">
              x<sup className="not-italic text-[10px]">{is2nd ? '3' : '2'}</sup>
            </span>
          </button>
        </div>

        <div className="flex flex-col">
          <SubHeader gold="ˣ√y" shift={shift} />
          <button type="button" onClick={() => onKeyPress('POW')} className={sciBtnBase}>
            <span className="italic font-serif">
              {is2nd ? 'ˣ√y' : (
                <>
                  x<sup className="text-[10px]">y</sup>
                </>
              )}
            </span>
          </button>
        </div>

        <div className="flex flex-col">
          <SubHeader
            gold={
              <span>
                10<sup>x</sup>
              </span>
            }
            shift={shift}
          />
          <button type="button" onClick={() => onKeyPress('LOG')} className={sciBtnBase + ' !text-[14px]'}>
            {is2nd ? (
              <span>
                10<sup className="text-[10px]">x</sup>
              </span>
            ) : (
              'Log'
            )}
          </button>
        </div>

        <div className="flex flex-col">
          <SubHeader
            gold={
              <span>
                e<sup>x</sup>
              </span>
            }
            purple="t"
            shift={shift}
          />
          <button type="button" onClick={() => onKeyPress('LN')} className={sciBtnBase + ' !text-[14px]'}>
            {is2nd ? (
              <span className="italic font-serif">
                e<sup className="text-[10px]">x</sup>
              </span>
            ) : (
              'Ln'
            )}
          </button>
        </div>
      </div>

      {/* ROW 4 (6 columns): (-), ° ' ", hyp, Sin, Cos, Tan */}
      <div className="grid grid-cols-6 gap-[5px] sm:gap-[6px]">
        <div className="flex flex-col">
          <SubHeader gold="∠" purple="a" shift={shift} />
          <button type="button" onClick={() => onKeyPress('NEG')} className={sciBtnBase}>
            (−)
          </button>
        </div>

        <div className="flex flex-col">
          <SubHeader gold="FACT" purple="b" shift={shift} />
          <button type="button" onClick={() => onKeyPress('DMS')} className={sciBtnBase + ' !text-[14px]'}>
            ° &apos; &quot;
          </button>
        </div>

        <div className="flex flex-col">
          <SubHeader gold="| x |" purple="c" shift={shift} />
          <button type="button" onClick={() => onKeyPress('HYP')} className={sciBtnBase + ' !text-[14px]'}>
            hyp
          </button>
        </div>

        <div className="flex flex-col">
          <SubHeader
            gold={
              <span>
                Sin<sup>−1</sup>
              </span>
            }
            purple="d"
            shift={shift}
          />
          <button type="button" onClick={() => onKeyPress('SIN')} className={sciBtnBase + ' !text-[14px]'}>
            {is2nd ? 'Sinh' : 'Sin'}
          </button>
        </div>

        <div className="flex flex-col">
          <SubHeader
            gold={
              <span>
                Cos<sup>−1</sup>
              </span>
            }
            purple="e"
            shift={shift}
          />
          <button type="button" onClick={() => onKeyPress('COS')} className={sciBtnBase + ' !text-[14px]'}>
            {is2nd ? 'Cosh' : 'Cos'}
          </button>
        </div>

        <div className="flex flex-col">
          <SubHeader
            gold={
              <span>
                Tan<sup>−1</sup>
              </span>
            }
            purple="f"
            shift={shift}
          />
          <button type="button" onClick={() => onKeyPress('TAN')} className={sciBtnBase + ' !text-[14px]'}>
            {is2nd ? 'Tanh' : 'Tan'}
          </button>
        </div>
      </div>

      {/* ROW 5 (6 columns): RCL, ENG, (, ), S ⇌ D, M+ */}
      <div className="grid grid-cols-6 gap-[5px] sm:gap-[6px]">
        <div className="flex flex-col">
          <SubHeader gold="STO" purple="CLRv" shift={shift} />
          <button
            type="button"
            onClick={() => onKeyPress('RCL')}
            className={`${sciBtnBase} !text-[13px] sm:!text-[14px] ${
              stoPending ? 'ring-2 ring-[#F8C42C]' : ''
            }`}
          >
            RCL
          </button>
        </div>

        <div className="flex flex-col">
          <SubHeader gold={<span className="italic font-serif">i</span>} purple="Cot" shift={shift} />
          <button type="button" onClick={() => onKeyPress('ENG')} className={sciBtnBase + ' !text-[13px] sm:!text-[14px]'}>
            ENG
          </button>
        </div>

        <div className="flex flex-col">
          <SubHeader
            gold="%"
            purple={
              <span>
                Cot<sup>−1</sup>
              </span>
            }
            shift={shift}
          />
          <button type="button" onClick={() => onKeyPress('LPAREN')} className={sciBtnBase}>
            (
          </button>
        </div>

        <div className="flex flex-col">
          <SubHeader gold="," purple={<span className="italic font-serif">x</span>} shift={shift} />
          <button type="button" onClick={() => onKeyPress('RPAREN')} className={sciBtnBase}>
            )
          </button>
        </div>

        <div className="flex flex-col">
          <SubHeader gold="x/y→a b/c" purple={<span className="italic font-serif">y</span>} shift={shift} />
          <button type="button" onClick={() => onKeyPress('SD')} className={sciBtnBase + ' !text-[13px]'}>
            S ⇌ D
          </button>
        </div>

        <div className="flex flex-col">
          <SubHeader gold="M−" purple="m" shift={shift} />
          <button type="button" onClick={() => onKeyPress('MPLUS')} className={sciBtnBase + ' !text-[14px]'}>
            M+
          </button>
        </div>
      </div>

      {/* LOWER NUMERIC & OPERATOR BLOCK (5 columns) */}
      {/* ROW 6: 7, 8, 9, DEL, AC */}
      <div className="grid grid-cols-5 gap-[6px] mt-0.5">
        <div className="flex flex-col">
          <SubHeader gold="CONST" shift={shift} />
          <button type="button" onClick={() => onKeyPress('N7')} className={numBtnBase}>
            7
          </button>
        </div>

        <div className="flex flex-col">
          <SubHeader gold="CONV" purple="SI" shift={shift} />
          <button type="button" onClick={() => onKeyPress('N8')} className={numBtnBase}>
            8
          </button>
        </div>

        <div className="flex flex-col">
          <SubHeader gold="Limit" purple="∞" shift={shift} />
          <button type="button" onClick={() => onKeyPress('N9')} className={numBtnBase}>
            9
          </button>
        </div>

        <div className="flex flex-col">
          <SubHeader shift={shift} />
          <button
            type="button"
            aria-label="Backspace"
            onClick={() => onKeyPress('DEL')}
            className="calc-key w-full h-[44px] sm:h-[48px] rounded-[8px] border-t border-white/25 shadow-[0_2px_0_rgba(0,0,0,0.5)] bg-[#E69B56] hover:bg-[#EDA869] text-[#151618] flex items-center justify-center cursor-pointer"
          >
            <svg viewBox="0 0 28 20" className="w-7 h-5" fill="currentColor">
              <path d="M9.5 2L2 10l7.5 8H26V2H9.5zm11.2 11.4l-1.4 1.4L16 11.4l-3.3 3.4-1.4-1.4L14.6 10l-3.3-3.4 1.4-1.4L16 8.6l3.3-3.4 1.4 1.4L17.4 10l3.3 3.4z" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col">
          <SubHeader gold="CLR ALL" shift={shift} />
          <button
            type="button"
            onClick={() => onKeyPress('AC')}
            className="calc-key w-full h-[44px] sm:h-[48px] rounded-[8px] border-t border-white/25 shadow-[0_2px_0_rgba(0,0,0,0.5)] bg-[#E69B56] hover:bg-[#EDA869] text-[#151618] flex items-center justify-center font-bold text-[20px] sm:text-[22px] tracking-tight cursor-pointer"
          >
            AC
          </button>
        </div>
      </div>

      {/* ROW 7: 4, 5, 6, ×, ÷ */}
      <div className="grid grid-cols-5 gap-[6px]">
        <div className="flex flex-col">
          <SubHeader
            gold="MATRIX"
            purple={
              <span className="inline-grid grid-cols-3 gap-[1px] p-[1px] border border-[#9D85E8]/60 rounded-[2px]">
                <span className="w-[2.5px] h-[2.5px] bg-[#9D85E8]" />
                <span className="w-[2.5px] h-[2.5px] bg-[#9D85E8]" />
                <span className="w-[2.5px] h-[2.5px] bg-[#9D85E8]" />
                <span className="w-[2.5px] h-[2.5px] bg-[#9D85E8]" />
                <span className="w-[2.5px] h-[2.5px] bg-[#9D85E8]" />
                <span className="w-[2.5px] h-[2.5px] bg-[#9D85E8]" />
              </span>
            }
            shift={shift}
          />
          <button type="button" onClick={() => onKeyPress('N4')} className={numBtnBase}>
            4
          </button>
        </div>

        <div className="flex flex-col">
          <SubHeader gold="VECTOR" shift={shift} />
          <button type="button" onClick={() => onKeyPress('N5')} className={numBtnBase}>
            5
          </button>
        </div>

        <div className="flex flex-col">
          <SubHeader gold="FUNC" purple="HELP" shift={shift} />
          <button type="button" onClick={() => onKeyPress('N6')} className={numBtnBase}>
            6
          </button>
        </div>

        <div className="flex flex-col">
          <SubHeader gold="nPr" purple="GCD" shift={shift} />
          <button type="button" onClick={() => onKeyPress('MUL')} className={numBtnBase}>
            ×
          </button>
        </div>

        <div className="flex flex-col">
          <SubHeader gold="nCr" purple="LCM" shift={shift} />
          <button type="button" onClick={() => onKeyPress('DIV')} className={numBtnBase}>
            ÷
          </button>
        </div>
      </div>

      {/* ROW 8: 1, 2, 3, +, − */}
      <div className="grid grid-cols-5 gap-[6px]">
        <div className="flex flex-col">
          <SubHeader gold="STAT" shift={shift} />
          <button type="button" onClick={() => onKeyPress('N1')} className={numBtnBase}>
            1
          </button>
        </div>

        <div className="flex flex-col">
          <SubHeader gold="CMPLX" shift={shift} />
          <button type="button" onClick={() => onKeyPress('N2')} className={numBtnBase}>
            2
          </button>
        </div>

        <div className="flex flex-col">
          <SubHeader gold="DISTR" shift={shift} />
          <button type="button" onClick={() => onKeyPress('N3')} className={numBtnBase}>
            3
          </button>
        </div>

        <div className="flex flex-col">
          <SubHeader gold="Pol" purple="Ceil" shift={shift} />
          <button type="button" onClick={() => onKeyPress('ADD')} className={numBtnBase}>
            +
          </button>
        </div>

        <div className="flex flex-col">
          <SubHeader gold="Rec" purple="Floor" shift={shift} />
          <button type="button" onClick={() => onKeyPress('SUB')} className={numBtnBase}>
            −
          </button>
        </div>
      </div>

      {/* ROW 9: 0, ., Exp, Ans, = */}
      <div className="grid grid-cols-5 gap-[6px]">
        <div className="flex flex-col">
          <SubHeader gold="COPY" purple="PASTE" shift={shift} />
          <button type="button" onClick={() => onKeyPress('N0')} className={numBtnBase}>
            0
          </button>
        </div>

        <div className="flex flex-col">
          <SubHeader gold="Ran#" purple="RanInt" shift={shift} />
          <button type="button" onClick={() => onKeyPress('DOT')} className={numBtnBase}>
            .
          </button>
        </div>

        <div className="flex flex-col">
          <SubHeader gold="π" purple={<span className="italic font-serif">e</span>} shift={shift} />
          <button type="button" onClick={() => onKeyPress('EXP')} className={numBtnBase + ' !font-sans !text-[19px] sm:!text-[20px]'}>
            Exp
          </button>
        </div>

        <div className="flex flex-col">
          <SubHeader purple="PreAns" shift={shift} />
          <button type="button" onClick={() => onKeyPress('ANS')} className={numBtnBase + ' !font-sans !text-[19px] sm:!text-[20px]'}>
            Ans
          </button>
        </div>

        <div className="flex flex-col">
          <SubHeader gold="History" shift={shift} />
          <button type="button" onClick={() => onKeyPress('EQ')} className={numBtnBase}>
            =
          </button>
        </div>
      </div>
    </div>
  );
};
