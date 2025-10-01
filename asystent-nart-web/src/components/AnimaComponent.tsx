const skiData = {
  name: "Narty knaissl xc 144 cm",
  weight: "65-120 / 75 kg",
  height: "155-170/165 cm",
  level: "5D/5D",
  gender: "Damksa/Kobieta",
  purpose: "Slalom/Pomiędzy",
  match: "95,5%",
};

export const Frame = (): React.JSX.Element => {
  return (
    <div className="relative w-[1046px] h-[343px] bg-[#a5c1ef] rounded-[20px] overflow-hidden">
      <div className="absolute top-8 left-[543px] w-[467px] h-[131px] bg-[#194476] rounded-[20px]" />

      <div className="absolute top-8 left-9 w-[467px] h-[131px] bg-[#194476] rounded-[20px] overflow-hidden">
        <div className="absolute top-[7px] left-8 w-[404px] h-[30px] flex bg-[#a5c1ef] rounded-[20px] overflow-hidden border border-solid border-white">
          <p className="flex items-center justify-center mt-[-5px] w-72 h-[35px] ml-[61px] font-adlam font-normal text-black text-[25px] tracking-[0] leading-[35.0px]">
            {skiData.name}
          </p>
            </div>

        <div className="absolute top-[43px] left-8 w-[147px] h-[19px] bg-[#a5c1ef] rounded-[20px] border border-solid border-white" />

        <div className="absolute top-[60px] left-[254px] w-[77px] h-[18px] flex bg-[#a5c1ef] rounded-[20px] overflow-hidden border border-solid border-white">
          <div className="flex items-center justify-center mt-0.5 w-[68px] h-3.5 ml-[5px] font-adlam font-normal text-black text-[10px] tracking-[0] leading-[14.0px] whitespace-nowrap">
            {skiData.weight}
                </div>
              </div>

        <div className="absolute top-10 left-[277px] h-3.5 flex items-center justify-center font-adlam font-normal text-white text-[10px] tracking-[0] leading-[14.0px] whitespace-nowrap">
          Waga:
              </div>

        <div className="absolute top-[100px] left-[252px] w-[77px] h-[18px] flex bg-[#a5c1ef] rounded-[20px] overflow-hidden border border-solid border-white">
          <div className="flex items-center justify-center mt-0.5 w-[73px] h-3.5 ml-0.5 font-adlam font-normal text-black text-[10px] tracking-[0] leading-[14.0px] whitespace-nowrap">
            {skiData.height}
                </div>
              </div>

        <div className="absolute top-[81px] left-[271px] h-3.5 flex items-center justify-center font-adlam font-normal text-white text-[10px] tracking-[0] leading-[14.0px] whitespace-nowrap">
          Wzrost:
              </div>

        <div className="absolute top-[60px] left-[357px] w-[65px] h-[18px] flex bg-[#a5c1ef] rounded-[20px] overflow-hidden border border-solid border-white">
          <div className="flex items-center justify-center mt-0.5 w-[31px] h-3.5 ml-[19px] font-adlam font-normal text-black text-[10px] tracking-[0] leading-[14.0px] whitespace-nowrap">
            {skiData.level}
                </div>
              </div>

        <div className="absolute top-10 left-[370px] h-3.5 flex items-center justify-center font-adlam font-normal text-white text-[10px] tracking-[0] leading-[14.0px] whitespace-nowrap">
          Poziom:
            </div>

        <div className="absolute top-[101px] left-[344px] w-[92px] h-[18px] flex bg-[#a5c1ef] rounded-[20px] overflow-hidden border border-solid border-white">
          <div className="flex items-center justify-center mt-px w-20 h-3.5 ml-1.5 font-adlam font-normal text-black text-[10px] tracking-[0] leading-[14.0px] whitespace-nowrap">
            {skiData.gender}
            </div>
          </div>

        <div className="absolute top-[81px] left-[378px] h-3.5 flex items-center justify-center font-adlam font-normal text-white text-[10px] tracking-[0] leading-[14.0px] whitespace-nowrap">
          Płeć:
            </div>

        <p className="absolute top-[77px] left-3 h-[21px] flex items-center justify-center font-adlam font-bold text-white text-[12px] tracking-[0] leading-[21.0px] whitespace-nowrap">
          <span className="text-[#b3b0b0]">Przeznaczenie:</span>
          <span className="text-white text-[12px] leading-[14.0px] ml-1">
            {skiData.purpose}
          </span>
        </p>

        <p className="absolute top-[101px] left-3 h-[21px] flex items-center justify-center font-adlam font-bold text-white text-[12px] tracking-[0] leading-[21.0px] whitespace-nowrap">
          <span className="text-[#6a86ec]">Dopasowanie:</span>
          <span className="text-white text-[12px] leading-[14.0px] ml-1">
            {skiData.match}
          </span>
        </p>
      </div>
    </div>
  );
};

export default Frame;
