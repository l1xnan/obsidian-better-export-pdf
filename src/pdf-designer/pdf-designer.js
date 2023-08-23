/**************************************************/
/*                                                */
/*     PDFDesigner                                */
/*                         JavaScript version     */
/*                                      v1.00     */
/*     http://www.petitmonte.com/pdfdesigner/     */
/*                                                */
/*     Copyright 2015 Takeshi Okamoto (Japan)     */
/*     Released under the MIT license             */
/*                                                */
/*                            Date: 2015-12-24    */
/**************************************************/

////////////////////////////////////////////////////////////////////////////////
// This is the error message for the time of development.
////////////////////////////////////////////////////////////////////////////////

// TPDFAnalyst
const PDFDESIGNER_ERROR_001 = "There is no stream.";
const PDFDESIGNER_ERROR_002 = "Index out of range.";
const PDFDESIGNER_ERROR_003 = "Unimplemented";
const PDFDESIGNER_ERROR_004 = "ObjectID is invalid.";
const PDFDESIGNER_ERROR_005 = "Stream is invalid.";
const PDFDESIGNER_ERROR_006 = "FirstPage does not exist.";
const PDFDESIGNER_ERROR_007 = "The position of the cross-reference table is invalid.";
const PDFDESIGNER_ERROR_008 = "Top object number of the cross-reference table is invalid.";
const PDFDESIGNER_ERROR_009 = "Number of items in the cross-reference table is invalid.";
const PDFDESIGNER_ERROR_010 = "Trailer is not correct.";
const PDFDESIGNER_ERROR_011 = "It failed to get RootID.";
const PDFDESIGNER_ERROR_012 = "It failed to get PrevID.";
const PDFDESIGNER_ERROR_013 = "It failed to get InfoID.";
const PDFDESIGNER_ERROR_014 = "File is corrupted.";
const PDFDESIGNER_ERROR_015 = "Not a PDF file.";
const PDFDESIGNER_ERROR_016 = "%%EOF is not.";
const PDFDESIGNER_ERROR_017 = "The position of the cross-reference table could not be accurately obtained.";
const PDFDESIGNER_ERROR_018 = "RootID could not be obtained accurately.";
const PDFDESIGNER_ERROR_019 = "FirstPagebID could not be obtained accurately.";
const PDFDESIGNER_ERROR_020 = "(Reservation)";
const PDFDESIGNER_ERROR_021 = "(Reservation)";
const PDFDESIGNER_ERROR_022 = "(Reservation)";
const PDFDESIGNER_ERROR_023 = "(Reservation)";
const PDFDESIGNER_ERROR_024 = "(Reservation)";

// all class
const PDFDESIGNER_ERROR_025 = "It does not support encrypted files.";
const PDFDESIGNER_ERROR_026 = "(Reservation)";
const PDFDESIGNER_ERROR_027 = "(Reservation)";
const PDFDESIGNER_ERROR_028 = "(Reservation)";
const PDFDESIGNER_ERROR_029 = "(Reservation)";

// TPDFKnife,TPDFDeletePage,TPDFRotatePage,TPDFOutLineManager
const PDFDESIGNER_ERROR_030 = "The page is out of range.";
const PDFDESIGNER_ERROR_031 = "(Reservation)";
const PDFDESIGNER_ERROR_032 = "(Reservation)";
const PDFDESIGNER_ERROR_033 = "(Reservation)";
const PDFDESIGNER_ERROR_034 = "(Reservation)";

// TPDFDeletePage
const PDFDESIGNER_ERROR_035 = "It is not possible to remove all of the page.";
const PDFDESIGNER_ERROR_036 = "(Reservation)";
const PDFDESIGNER_ERROR_037 = "(Reservation)";
const PDFDESIGNER_ERROR_038 = "(Reservation)";
const PDFDESIGNER_ERROR_039 = "(Reservation)";

// TPDFRotatePage
const PDFDESIGNER_ERROR_040 = "Please set 1-3 to Rotate the third argument.";
const PDFDESIGNER_ERROR_041 = "(Reservation)";
const PDFDESIGNER_ERROR_042 = "(Reservation)";
const PDFDESIGNER_ERROR_043 = "(Reservation)";
const PDFDESIGNER_ERROR_044 = "(Reservation)";

// TPDFCode
const PDFDESIGNER_ERROR_045 = "Unicode strings are interrupted in the middle.";
const PDFDESIGNER_ERROR_046 = "(Reservation)";
const PDFDESIGNER_ERROR_047 = "(Reservation)";
const PDFDESIGNER_ERROR_048 = "(Reservation)";
const PDFDESIGNER_ERROR_049 = "(Reservation)";

// TPDFNode,TPDFNodeList,TPDFOutLineManager
const PDFDESIGNER_ERROR_050 = "Child node is not created.";
const PDFDESIGNER_ERROR_051 = "Index is invalid.";
const PDFDESIGNER_ERROR_052 =
  "Hierarchy level of bookmark is up to five levels. No more, you can not add a child node.";
const PDFDESIGNER_ERROR_053 = "Node is not created.";
const PDFDESIGNER_ERROR_054 = "(Reservation)";

////////////////////////////////////////////////////////////////////////////////
// Generic Function
////////////////////////////////////////////////////////////////////////////////

// CR/LFと空白は読み飛ばす
function PDF_SeekPos(AStream) {
  var P;

  while (true) {
    P = AStream.ReadString(1);
    if (!(P == "\n" || P == "\r" || P == " ")) {
      AStream.Pos = AStream.Pos - 1;
      break;
    }
  }
}

// CR/LFが出現するまでループ
function PDF_CommnetSkip(AStream) {
  var P;

  while (true) {
    P = AStream.ReadString(1);
    if (P == "\n" || P == "\r") break;
  }
}

// 文字列を取得
function PDF_GetString(AStream) {
  var P;
  var Result = "";

  PDF_SeekPos(AStream);

  while (true) {
    P = AStream.ReadString(1);
    //  {,},#,\ も考慮したほうがいいかも
    if (
      P == "\n" ||
      P == "\r" ||
      P == " " ||
      P == "/" ||
      P == "[" ||
      P == "]" ||
      P == "(" ||
      P == ")" ||
      P == "<" ||
      P == ">" ||
      P == "%"
    ) {
      // CR/LF 空白ならば終了
      if (P == "\n" || P == "\r" || P == " ") {
        AStream.Pos = AStream.Pos - 1;
        break;
      } else {
        // 文字列が空で無い場合で /,[,],(,),<,>,% がヒットした場合
        if (Result != "") {
          AStream.Pos = AStream.Pos - 1;
          break;
        } else {
          // 文字列が空のときで / ではないとき
          if (P != "/") {
            Result = P;
            break;
          }
        }
      }
    }
    Result = Result + P;
  }

  return Result;
}

// PDFのテキストをスキップする
function PDF_TextSkip(AStream) {
  var P;

  while (true) {
    P = AStream.ReadString(1);
    if (AStream.Pos > AStream.FileSize) break;

    if (P == "\\") {
      // 8進表記かエスケープかを判別するため次の文字を取得
      P = AStream.ReadString(1);
      if (AStream.Pos > AStream.FileSize) break;

      // この[\]はエスケープ文字である
      // '\','(',')','n','r','t', 'b','f'

      // この[\]は改行コードである
      if (P == "\n" || P == "\r") {
        // 改行コードが「CR+LF」かチェック
        if (P == "\r") {
          P = AStream.ReadString(1);
          if (P != "\n") AStream.Pos = AStream.Pos - 1;
        }
        // この[\]は8進表記である
      } else if (P.match(/[0-9]+/)) {
        // 8進表記(\ddd)の \dxx のとき
        P = AStream.ReadString(1);
        if (AStream.Pos > AStream.FileSize || P == ")") break;
        if (P.match(/[^0-9]+/)) continue;

        // 8進表記(\ddd)の \ddx のとき
        P = AStream.ReadString(1);
        if (AStream.Pos > AStream.FileSize || P == ")") break;
        if (P.match(/[^0-9]+/)) continue;
      }
    } else if (P == ")") {
      break;
    }
  }
}

// オブジェクトの1行目をスキップする
function PDF_TopLineSkip(AStream) {
  var P;

  PDF_GetString(AStream); // オブジェクト番号
  PDF_GetString(AStream); // オブジェクト世代番号
  PDF_GetString(AStream); // obj

  // コメント(%)があればスキップする
  P = PDF_GetString(AStream);
  if (P == "%") {
    PDF_CommnetSkip(AStream);
  } else {
    AStream.Pos = AStream.Pos - P.length;
  }
}

// 辞書をスキップ
function PDF_DictionarySkip(AStream) {
  var P;
  var Count = 0;
  var Result = false;

  while (true) {
    P = PDF_GetString(AStream);
    // 辞書のはじめ --------------------------------------------------------
    if (P == "<") {
      Count++;
      // 辞書のおわり --------------------------------------------------------
    } else if (P == ">") {
      Count--;
      if (Count == 0) {
        Result = true;
        break;
      }
      // コメントのスキップ --------------------------------------------------
    } else if (P == "%") {
      PDF_CommnetSkip(AStream);
      // テキストのスキップ --------------------------------------------------
    } else if (P == "(") {
      PDF_TextSkip(AStream);
      // オブジェクトの終わり ------------------------------------------------
    } else if (P == "endobj") {
      Result = false;
      break;
    }
  }

  return Result;
}

// 配列をスキップ
function PDF_ArraySkip(AStream) {
  var P;
  var Result = false;

  while (true) {
    P = PDF_GetString(AStream);
    // 配列のおわり --------------------------------------------------------
    if (P == "]") {
      Result = true;
      break;
      // 辞書のはじめ --------------------------------------------------------
    } else if (P == "<") {
      AStream.Pos = AStream.Pos - 1;
      if (!PDF_DictionarySkip(AStream)) {
        Result = false;
        break;
      }
      // コメントのスキップ --------------------------------------------------
    } else if (P == "%") {
      PDF_CommnetSkip(AStream);
      // テキストのスキップ --------------------------------------------------
    } else if (P == "(") {
      PDF_TextSkip(AStream);
      // オブジェクトの終わり ------------------------------------------------
    } else if (P == "endobj") {
      Result = false;
      break;
    }
  }

  return Result;
}

// 名前をスキップ
function PDF_NameSkip(AStream) {
  var P;
  var Result = false;

  while (true) {
    P = PDF_GetString(AStream);
    if (P == "") Continue;

    // 配列のおわり --------------------------------------------------------
    if (P[0] == "/") {
      Result = true;
      break;
      // コメントのスキップ --------------------------------------------------
    } else if (P == "%") {
      PDF_CommnetSkip(AStream);
      // オブジェクトの終わり ------------------------------------------------
    } else if (P == "endobj") {
      Result = false;
      break;
    }
  }

  return Result;
}

// [ .. ]からRect構造体を取得
function PDF_GetMediaBoxRect(S) {
  var P = S;
  var i = 0;

  function GetValue() {
    var Result = "";

    while (true) {
      if (i >= P.length - 1) break;
      if (P[i] == "+" || P[i] == "-" || P[i].match(/[0-9]+/)) break;
      i++;
    }

    while (true) {
      if (i >= P.length - 1) break;
      if (P[i] == "\n" || P[i] == "\r" || P[i] == " " || P[i] == "]") break;
      Result = Result + P[i];
      i++;
    }

    if (Result == "") Result = "0";

    return Result;
  }

  var Rect = new TRect();

  try {
    Rect.Left = Math.round(parseFloat(GetValue()));
    Rect.Top = Math.round(parseFloat(GetValue()));
    Rect.Right = Math.round(parseFloat(GetValue()));
    Rect.Bottom = Math.round(parseFloat(GetValue()));
  } catch (e) {
    Rect.Left = 0;
    Rect.Top = 0;
    Rect.Right = 0;
    Rect.Bottom = 0;
  }

  return Rect;
}

// RectからWidthを取り出す
function PDF_RectToWidth(Rect) {
  if (Rect.Left <= Rect.Right) return Rect.Right - Rect.Left;
  else return Rect.Left - Rect.Right;
}

// RectからHeightを取り出す
function PDF_RectToHeight(Rect) {
  if (Rect.Top <= Rect.Bottom) return Rect.Bottom - Rect.Top;
  else return Rect.Top - Rect.Bottom;
}

// 単位をmm(ミリ)からポイントに変換
function PDF_mmToPts(mm) {
  return Math.round((72 / 25.4) * mm);
}

// 単位をポイントからmm(ミリ)に変換
function PDF_PtsTomm(Pts) {
  return Math.round((25.4 * Pts) / 72);
}

// 現在時刻を取得する yyyymmddhhmmss形式
function PDF_GetDateTime_Now() {
  // 月日時分秒を2桁にする
  function DoubleDigit(Value) {
    var result = Value + "";

    if (result.length == 1) {
      return "0" + result;
    } else {
      return result;
    }
  }

  var NowTime = new Date();

  return (
    NowTime.getFullYear() +
    DoubleDigit(NowTime.getMonth() + 1) +
    DoubleDigit(NowTime.getDate()) +
    DoubleDigit(NowTime.getHours()) +
    DoubleDigit(NowTime.getMinutes()) +
    DoubleDigit(NowTime.getSeconds())
  );
}

// 重複カット
function PDF_OverlappingCut(ObjectList) {
  var V;
  var L = new Array();
  var Flags = false;
  var len = ObjectList.length;
  var Result = new Array();

  for (var i = 0; i < len; i++) {
    L[L.length] = -1;
  }

  for (var i = 0; i < len; i++) {
    Flags = false;
    V = ObjectList[i];
    for (var j = 0; j < len; j++) {
      if (V == L[j]) {
        Flags = true;
        break;
      }
    }
    if (!Flags) {
      Result[Result.length] = ObjectList[i];
      L[i] = V;
    }
  }

  return Result;
}

// 文字列から整数に変換
function PDF_StrToIntDef(S, Default) {
  var Result = parseInt(S, 10);

  if (isNaN(Result)) {
    Result = Default;
  }

  return Result;
}

// 文字列から浮動小数点値に変換
function PDF_StrToFloatDef(S, Default) {
  var Result = -32768;

  if (S != "null") {
    Result = parseFloat(S);
  }

  if (isNaN(Result)) {
    Result = Default;
  }

  return Result;
}

// 整数から文字列のオブジェクト番号へ変換
function PDF_ConvertObjectPos(S, digits) {
  var P = S + "";
  var len = P.length;
  var Result = "";

  for (var i = 0; i < digits - len; i++) {
    Result = Result + "0";
  }
  return Result + P;
}

// RGBからTColorを返す
function PDF_RGB(Red, Green, Blue) {
  var Result = new TColor();

  Result.Red = Red;
  Result.Green = Green;
  Result.Blue = Blue;

  return Result;
}

////////////////////////////////////////////////////////////////////////////////
// Generic Class
////////////////////////////////////////////////////////////////////////////////

// ---------------------
//  TPDFObjMemManager
// ---------------------
function TPDFObjMemManager() {
  this.ObjectIndex = 0; // オブジェクトインデックス
  this.ObjectPosArray = new Array(); // オブジェクトの位置への配列
}

// ---------------------
//  TReadStream
// ---------------------
function TReadStream(AStream) {
  this.Pos = 0;
  this.Stream = AStream;
  this.FileSize = AStream.length;
}

// ---------------------
//  TReadStream.Method
// ---------------------
TReadStream.prototype = {
  Read: function (ReadByteCount) {
    var P = this.Stream.subarray(this.Pos, this.Pos + ReadByteCount);
    this.Pos = this.Pos + ReadByteCount;
    return P;
  },

  ReadString: function (ReadByteCount) {
    var P = String.fromCharCode.apply(null, this.Stream.subarray(this.Pos, this.Pos + ReadByteCount));
    this.Pos = this.Pos + ReadByteCount;
    return P;
  },
};

// ---------------------
//  TMemoryStream
// ---------------------
function TMemoryStream(AStream, begin, end) {
  this.Pos = 0;

  // TReadStream
  if (AStream.Stream.subarray) this.Stream = new Uint8Array(AStream.Stream.subarray(begin, end));
  else this.Stream = new Uint8Array(Stream.subarray(begin, end));
}

// ---------------------
//  TMemoryStream.Method
// ---------------------
TMemoryStream.prototype = {
  _AsciiToUint8Array: function (S) {
    var len = S.length;
    var P = new Uint8Array(len);
    for (var i = 0; i < len; i++) {
      P[i] = S[i].charCodeAt(0);
    }
    return P;
  },

  _Combine: function (U1, U2) {
    var len1 = U1.length;
    var len2 = U2.length;
    var P = new Uint8Array(len1 + len2);

    P.set(U1, 0);
    P.set(U2, len1);

    return P;
  },

  Read: function (ReadByteCount) {
    var P = this.Stream.subarray(this.Pos, this.Pos + ReadByteCount);
    this.Pos = this.Pos + ReadByteCount;
    return P;
  },

  ReadString: function (ReadByteCount) {
    var P = String.fromCharCode.apply(null, this.Stream.subarray(this.Pos, this.Pos + ReadByteCount));
    this.Pos = this.Pos + ReadByteCount;
    return P;
  },

  WriteString: function (S) {
    // Garbage collection :-)
    this.Stream = this._Combine(this.Stream, this._AsciiToUint8Array(S));
  },

  WriteStream: function (AStream, begin, end) {
    // Garbage collection :-)
    if (AStream.Stream.subarray) this.Stream = this._Combine(this.Stream, AStream.Stream.subarray(begin, end));
    else this.Stream = this._Combine(this.Stream, AStream.subarray(begin, end));
  },

  getFileSize: function () {
    return this.Stream.length;
  },
};

// ---------------------
//  TFileStream
// ---------------------
function TFileStream(BufferSize) {
  if (BufferSize == undefined) this.MemorySize = 30000000; // 30M
  else this.MemorySize = parseInt(BufferSize, 10);

  this.Pos = 0;
  this.Size = 0;
  this.Stream = new Uint8Array(this.MemorySize);
  this.WriteString("%PDF-");
}

// ---------------------
//  TFileStream.Method
// ---------------------
TFileStream.prototype = {
  _AsciiToUint8Array: function (S) {
    var len = S.length;
    var P = new Uint8Array(len);
    for (var i = 0; i < len; i++) {
      P[i] = S[i].charCodeAt(0);
    }
    return P;
  },

  WriteString: function (S) {
    var P = this._AsciiToUint8Array(S);

    // メモリの再編成
    if (this.Stream.length <= this.Size + P.length) {
      var B = new Uint8Array(this.Stream);
      this.Stream = new Uint8Array(this.Size + P.length + this.MemorySize);
      this.Stream.set(B.subarray(0, B.length));
    }

    this.Stream.set(P, this.Size);
    this.Size = this.Size + P.length;
  },

  WriteStream: function (AStream, begin, end) {
    var P = AStream.Stream.subarray(begin, end);

    // メモリの再編成
    if (this.Stream.length <= this.Size + P.length) {
      var B = new Uint8Array(this.Stream);
      this.Stream = new Uint8Array(this.Size + P.length + this.MemorySize);
      this.Stream.set(B.subarray(0, B.length));
    }

    this.Stream.set(P, this.Size);
    this.Size = this.Size + P.length;
  },

  Rewrite: function (MemoryStream) {
    // メモリの再編成
    if (this.Stream.length <= MemoryStream.getFileSize()) {
      this.Stream = new Uint8Array(MemoryStream.getFileSize() + this.MemorySize);
    }

    this.Stream.set(MemoryStream.Stream, 0);
    this.Size = MemoryStream.getFileSize();
  },

  getFileSize: function () {
    return this.Size;
  },

  SaveToFile: function (FileName) {
    if (window.navigator.msSaveBlob) {
      window.navigator.msSaveBlob(
        new Blob([this.Stream.subarray(0, this.Size)], {
          type: "application/pdf",
        }),
        FileName
      );
    } else {
      var a = document.createElement("a");
      a.href = URL.createObjectURL(
        new Blob([this.Stream.subarray(0, this.Size)], {
          type: "application/pdf",
        })
      );
      //a.target   = '_blank';
      a.download = FileName;
      document.body.appendChild(a); //  FF specification
      a.click();
      document.body.removeChild(a); //  FF specification
    }
  },
};

// ---------------------
//  TColor
// ---------------------
function TColor() {
  this.Red = 0;
  this.Green = 0;
  this.Blue = 0;
}

// ---------------------
//  TRect
// ---------------------
function TRect() {
  this.Left = 0;
  this.Top = 0;
  this.Right = 0;
  this.Bottom = 0;
}

////////////////////////////////////////////////////////////////////////////////
// TPDFAnalyst
////////////////////////////////////////////////////////////////////////////////

// ---------------------
//  TPDFAnalyst
// ---------------------
export function TPDFAnalyst(OpenFileName) {
  // Public Property
  this.FileName = OpenFileName; // ファイル名
  this.Version = ""; // PDFバージョン
  this.Stream = null; // TReadStream
  this.ObjectCount = -1; // オブジェクト数
  this.ObjectPosArray = new Array(); // オブジェクトの位置への配列
  this.DeleteObject = new Array(); // 削除済みオブジェクト
  this.XrefTableList = new Array(); // Xrefテーブルリスト
  this.Encrypt = false; // 暗号化
  this.Optimize = false; // Web用に最適化
  this.Tag = false; // タグ付きPDF
  this.PageCount = -1; // ページ数
  this.PageSize = new TRect(); // ページサイズ
  this.RootID = -1; // Root ID
  this.InfoID = -1; // Info ID
  this.MetadataID = -1; // Metadata ID
  this.FirstPageID = -1; // FirstPage ID
  this.FirstPagesID = -1; // FirstPages ID
  this.OutlinesID = -1; // Outlines ID
}

// ---------------------
//  TPDFAnalyst.Method
// ---------------------
TPDFAnalyst.prototype = {
  LoadError: function (ReadErrorText) {
    throw ReadErrorText;
  },

  // 指定されたオブジェクト番号は正しいのか判別する
  IsObjectID: function (ObjectID) {
    var id = PDF_StrToIntDef(ObjectID, -1);

    if (!(id < 0 || id > this.ObjectCount - 1)) {
      return true;
    } else {
      return false;
    }
  },

  // 相互参照テーブルを返す
  GetPointer: function () {
    throw PDFDESIGNER_ERROR_003;
  },

  // オブジェクト番号から世代番号を取得
  GetGenerationID: function (ObjectID) {
    var PrePos;
    var Result = -1;

    PrePos = this.Stream.Pos;
    this.Stream.Pos = parseInt(this.ObjectPosArray[ObjectID], 10);

    try {
      PDF_GetString(this.Stream);
      Result = PDF_StrToIntDef(PDF_GetString(this.Stream), -1);
    } finally {
      this.Stream.Pos = PrePos;
    }

    return Result;
  },

  // オブジェクトの参照チェック
  ObjectIndexCheck: function (Index) {
    if (this.Stream == null) this.LoadError(PDFDESIGNER_ERROR_001);

    if (!this.IsObjectID(Index)) this.LoadError(PDFDESIGNER_ERROR_002);
  },

  // オブジェクトの生データを返す
  GetObject: function (Index) {
    throw PDFDESIGNER_ERROR_003;
  },

  // Objectのサイズを計測
  GetObjectSize: function (Index) {
    var P, S;
    var StreamSize = 0;
    var PrePos;
    var Result = 0;

    this.ObjectIndexCheck(Index);

    // 削除済みオブジェクトならば終了
    if (this.DeleteObject[Index]) {
      return Result;
    }

    PrePos = this.Stream.Pos;
    this.Stream.Pos = parseInt(this.ObjectPosArray[Index], 10);

    while (true) {
      S = PDF_GetString(this.Stream);
      // コメントをスキップ ---------------------------------------------------
      if (S == "%") {
        PDF_CommnetSkip(this.Stream);
        // テキストをスキップ ---------------------------------------------------
      } else if (S == "(") {
        PDF_TextSkip(this.Stream);
        // ストリームの長さを取得 -----------------------------------------------
      } else if (S == "/Length") {
        StreamSize = this.GetObjectType_Integer();
        // ストリームをスキップする ---------------------------------------------
      } else if (S == "stream") {
        P = this.Stream.ReadString(1);
        if (P == "\r") {
          P = this.Stream.ReadString(1);
        }
        this.Stream.Pos = this.Stream.Pos + StreamSize;
        // オブジェクトの終端 ---------------------------------------------------
      } else if (S == "endobj") {
        break;
      }
    }

    Result = this.Stream.Pos - parseInt(this.ObjectPosArray[Index], 10);
    this.Stream.Pos = PrePos;

    return Result;
  },

  // オブジェクトをストリームで返す
  GetObjectStream: function (Index) {
    var Size = this.GetObjectSize(Index);
    var begin = parseInt(this.ObjectPosArray[Index], 10);
    var MemoryStream = new TMemoryStream(this.Stream, begin, begin + Size);

    MemoryStream.WriteString("\n");

    return MemoryStream;
  },

  // Integer型の間接参照から値を取得
  GetInDeirect_Integer: function (ObjectID) {
    var P;
    var PrePos;
    var Result = 0;

    PrePos = this.Stream.Pos;
    this.Stream.Pos = parseInt(this.ObjectPosArray[ObjectID], 10);

    PDF_TopLineSkip(this.Stream);

    while (true) {
      P = PDF_GetString(this.Stream);
      if (P == "") continue;

      if (P == "%") {
        PDF_CommnetSkip(this.Stream);
      } else if (P[0].match(/[1-9]+/)) {
        Result = PDF_StrToIntDef(P, 0);
        break;
      } else if (P == "endobj") {
        break;
      }
    }
    this.Stream.Pos = PrePos;

    return Result;
  },

  // Array型の間接参照から値を取得
  GetInDeirect_Array: function (ObjectID, ObjectList) {
    var P;
    var PrePos;
    var Result = false;

    PrePos = this.Stream.Pos;
    this.Stream.Pos = parseInt(this.ObjectPosArray[ObjectID], 10);

    PDF_TopLineSkip(this.Stream);

    // 配列でなければおわり
    P = PDF_GetString(this.Stream);
    if (P != "[") {
      this.Stream.Pos = PrePos;
      return Result;
    }

    while (true) {
      // 「オブジェクト番号」
      P = PDF_GetString(this.Stream);
      if (P == "]" || P == "endobj") {
        break;
      }

      ObjectID = PDF_StrToIntDef(P, -1);
      if (this.IsObjectID(ObjectID)) {
        ObjectList[ObjectList.length] = ObjectID;
      }

      // 「オブジェクト世代番号」
      P = PDF_GetString(this.Stream);
      if (P == "]" || P == "endobj") {
        break;
      }

      // 「R」
      P = PDF_GetString(this.Stream);
      if (P == "]" || P == "endobj") {
        break;
      }

      Result = true;
    }

    this.Stream.Pos = PrePos;

    return Result;
  },

  // Array of Name 型の間接参照から値を取得
  GetInDeirect_ArrayofName: function (ObjectID, ObjectList) {
    var P;
    var PrePos;
    var Result = false;

    PrePos = this.Stream.Pos;
    this.Stream.Pos = parseInt(this.ObjectPosArray[ObjectID], 10);

    PDF_TopLineSkip(this.Stream);

    // 配列でなければおわり
    P = PDF_GetString(this.Stream);
    if (P != "[") {
      this.Stream.Pos = PrePos;
      return Result;
    }

    while (true) {
      P = PDF_GetString(this.Stream);
      if (P == "") continue;
      if (P == "]" || (P = "endobj")) break;

      if (P[0] == "/") {
        Result = true;
        ObjectList[ObjectList.length] = P;
      }
    }

    this.Stream.Pos = PrePos;

    return Result;
  },

  // Integer型のオブジェクトから値を取得する (ex: Length etc..
  GetObjectType_Integer: function () {
    var S1, S2, S3;
    var PrePos, ObjectID;
    var Result = 0;

    PrePos = this.Stream.Pos;
    try {
      S1 = PDF_GetString(this.Stream); // 「オブジェクト番号」または「値」
      S2 = PDF_GetString(this.Stream); // 「オブジェクト世代番号」または「???」
      S3 = PDF_GetString(this.Stream); // 「R」または「???」

      // オブジェクトが正しければ
      if (S2.match(/[0-9]+/) && S3 == "R") {
        ObjectID = PDF_StrToIntDef(S1, -1);

        if (this.IsObjectID(ObjectID)) {
          Result = this.GetInDeirect_Integer(ObjectID);
        } else {
          Result = 0;
        }
      } else {
        Result = PDF_StrToIntDef(S1, 0);
      }
    } catch (e) {
      Result = 0;
    }
    this.Stream.Pos = PrePos;

    return Result;
  },

  // Array型のオブジェクトから値を取得する (ex: Annots,Contents etc..
  GetObjectType_Array: function (ObjectList) {
    var S;
    var ObjectID, PrePos;

    PrePos = this.Stream.Pos;
    S = PDF_GetString(this.Stream);

    // 配列型 ----------------------------------------------------------------
    if (S == "[") {
      while (true) {
        // 「オブジェクト番号」
        S = PDF_GetString(this.Stream);
        if (S == "]" || S == "endobj") {
          break;
        }

        ObjectID = PDF_StrToIntDef(S, -1);
        if (this.IsObjectID(ObjectID)) {
          ObjectList[ObjectList.length] = ObjectID;
        }

        // 「オブジェクト世代番号」
        S = PDF_GetString(this.Stream);
        if (S == "]" || S == "endobj") {
          break;
        }

        // 「R」
        S = PDF_GetString(this.Stream);
        if (S == "]" || S == "endobj") {
          break;
        }
      }
      // 単一のオブジェクト  ---------------------------------------------------
    } else {
      ObjectID = PDF_StrToIntDef(S, -1);
      if (this.IsObjectID(ObjectID)) {
        // 参照先で値がない場合はそのまま追加
        if (!this.GetInDeirect_Array(ObjectID, ObjectList)) {
          ObjectList[ObjectList.length] = ObjectID;
        }
      }
    }
    this.Stream.Pos = PrePos;
  },

  // Array of name 型のオブジェクトから値を取得する (ex: ProcSet,Filter etc..
  GetObjectType_ArrayofName: function (ObjectList) {
    var S;
    var ObjectID, PrePos;

    PrePos = this.Stream.Pos;
    S = PDF_GetString(this.Stream);

    // 配列型 ----------------------------------------------------------------
    if (S == "[") {
      while (true) {
        S = PDF_GetString(this.Stream);
        if (S == "]" || S == "endobj") break;
        if (S[0] == "/") ObjectList[ObjectList.length] = S;
      }
      // 単一のオブジェクト ----------------------------------------------------
    } else {
      if (S[0] == "/") {
        ObjectList[ObjectList.length] = S;
      } else if (S[0].match(/[1-9]+/)) {
        ObjectID = PDF_StrToIntDef(S, -1);
        if (this.IsObjectID(ObjectID)) {
          this.GetInDeirect_ArrayofName(ObjectID, ObjectList);
        }
      }
    }
    this.Stream.Pos = PrePos;
  },

  // ページIDからMediaBoxを取得する
  GetMediaBox: function (PageID) {
    var P, S;
    var MediaBoxbool = false;
    var ParentID = -1;
    var StreamSize = 0;
    var PrePos;
    var Result = "";

    if (!this.IsObjectID(PageID)) {
      return Result;
    }

    PrePos = this.Stream.Pos;
    this.Stream.Pos = parseInt(this.ObjectPosArray[PageID], 10);

    while (true) {
      S = PDF_GetString(this.Stream);
      // コメントスキップ -------------------------------------------------
      if (S == "%") {
        PDF_CommnetSkip(this.Stream);
        // Parentの取得 -----------------------------------------------------
      } else if (S == "/Parent") {
        S = PDF_GetString(this.Stream);
        ParentID = PDF_StrToIntDef(S, -1);
        // メディアボックスの取得--------------------------------------------
      } else if (S == "/MediaBox") {
        while (true) {
          P = this.Stream.ReadString(1);
          Result = Result + P;
          if (P == "]") break;
        }
        MediaBoxbool = true;
        break;
        // テキストをスキップ -----------------------------------------------
      } else if (S == "(") {
        PDF_TextSkip(this.Stream);
        // ストリームのサイズを取得------------------------------------------
      } else if (S == "/Length") {
        StreamSize = this.GetObjectType_Integer();
        // ストリームをスキップ ---------------------------------------------
      } else if (S == "stream") {
        P = this.Stream.ReadString(1);
        if (P == "\r") {
          P = this.Stream.ReadString(1);
        }
        this.Stream.Pos = this.Stream.Pos + StreamSize;
        // オブジェクトの終了 -----------------------------------------------
      } else if (S == "endobj") {
        break;
      }
    }

    // 親ページにある場合はそちらにとりに行く
    if (!MediaBoxbool && ParentID != -1) {
      Result = this.GetMediaBox(ParentID);
    }

    this.Stream.Pos = PrePos;

    return Result;
  },

  // ページIDとページ数の取得
  GetPageInfo: function (PageList) {
    // Pageオブジェクトを列挙する *******************************************
    function EnumPageObject(PDFAnalyst, ObjectID) {
      var P, S;
      var pList = new Array();
      var StreamSize = 0;

      try {
        PDFAnalyst.Stream.Pos = parseInt(PDFAnalyst.ObjectPosArray[ObjectID], 10);

        // オブジェクトIDのチェック
        S = PDF_GetString(PDFAnalyst.Stream);
        if (parseInt(S, 10) != ObjectID) {
          PDFAnalyst.LoadError(PDFDESIGNER_ERROR_004);
        }

        while (true) {
          S = PDF_GetString(PDFAnalyst.Stream);
          // コメントスキップ ----------------------------------------
          if (S == "%") {
            PDF_CommnetSkip(PDFAnalyst.Stream);
            // Kidsの取得 -----------------------------------------------
          } else if (S == "/Kids") {
            PDFAnalyst.GetObjectType_Array(pList);
            // Pageの取得 ----------------------------------------------
          } else if (S == "/Page") {
            PageList[PageList.length] = ObjectID;
            break;
            // テキストをスキップ --------------------------------------
          } else if (S == "(") {
            PDF_TextSkip(PDFAnalyst.Stream);
            // ストリームのサイズを取得---------------------------------
          } else if (S == "/Length") {
            StreamSize = PDFAnalyst.GetObjectType_Integer();
            // ストリームをスキップ ------------------------------------
          } else if (S == "stream") {
            P = PDFAnalyst.Stream.ReadString(1);
            if (P == "\r") {
              P = PDFAnalyst.Stream.ReadString(1);
            }
            PDFAnalyst.Stream.Pos = PDFAnalyst.Stream.Pos + StreamSize;
            // オブジェクトの終了 --------------------------------------
          } else if (S == "endobj") {
            break;
          }
        }

        // Pageの判定が出るまで再帰処理
        for (var i = 0; i < pList.length; i++) {
          EnumPageObject(PDFAnalyst, parseInt(pList[i], 10));
        }
      } catch (e) {
        // none
      }
    }

    if (this.Stream == null) {
      this.LoadError(PDFDESIGNER_ERROR_005);
    }

    if (this.FirstPagesID == -1) {
      this.LoadError(PDFDESIGNER_ERROR_006);
    }

    if (PageList == null) return;

    EnumPageObject(this, this.FirstPagesID);
  },

  // 最初のページからページサイズを取得する
  GetFirstPageSize: function () {
    // 最初のページIDを列挙する *********************************************
    function GetFirstPageID(PDFAnalyst, ObjectID) {
      var P, S;
      var StreamSize;
      var PageList = new Array();

      StreamSize = 0;
      try {
        PDFAnalyst.Stream.Pos = parseInt(PDFAnalyst.ObjectPosArray[ObjectID], 10);

        // オブジェクトIDのチェック
        S = PDF_GetString(PDFAnalyst.Stream);
        if (parseInt(S, 10) != ObjectID) {
          PDFAnalyst.LoadError(PDFDESIGNER_ERROR_004);
        }

        while (true) {
          S = PDF_GetString(PDFAnalyst.Stream);
          // コメントスキップ ----------------------------------------
          if (S == "%") {
            PDF_CommnetSkip(PDFAnalyst.Stream);
            // Kidsの取得 ----------------------------------------------
          } else if (S == "/Kids") {
            PDFAnalyst.GetObjectType_Array(PageList);
            // Pageの取得 ----------------------------------------------
          } else if (S == "/Page") {
            // 重複しないようにする
            if (PDFAnalyst.FirstPageID == -1) {
              PDFAnalyst.FirstPageID = ObjectID;
            }
            break;
            // テキストをスキップ --------------------------------------
          } else if (S == "(") {
            PDF_TextSkip(PDFAnalyst.Stream);
            // ストリームのサイズを取得---------------------------------
          } else if (S == "/Length") {
            StreamSize = PDFAnalyst.GetObjectType_Integer();
            // ストリームをスキップ ------------------------------------
          } else if (S == "stream") {
            P = PDFAnalyst.Stream.ReadString(1);
            if (P == "\r") {
              P = PDFAnalyst.Stream.ReadString(1);
            }
            PDFAnalyst.Stream.Pos = PDFAnalyst.Stream.Pos + StreamSize;
            // オブジェクトの終了 --------------------------------------
          } else if (S == "endobj") {
            break;
          }
        }

        // Pageの判定が出るまで再帰処理
        for (var i = 0; i < PageList.length; i++) {
          if (PDFAnalyst.FirstPageID == -1) {
            GetFirstPageID(PDFAnalyst, parseInt(PageList[i], 10));
          }
        }
      } catch (e) {
        // none
      }
    }

    var MediaBox;

    // 最初のページIDを取得
    this.FirstPageID = -1;
    GetFirstPageID(this, this.FirstPagesID);

    if (this.FirstPageID != -1) {
      // MediaBoxの取得
      MediaBox = this.GetMediaBox(this.FirstPageID);
      this.PageSize = PDF_GetMediaBoxRect(MediaBox);
    }
  },

  // ページ数を取得する
  GetPageCount: function () {
    var P;
    var PrePos;

    PrePos = this.Stream.Pos;
    this.Stream.Pos = parseInt(this.ObjectPosArray[this.FirstPagesID], 10);

    // オブジェクトIDのチェック
    P = PDF_GetString(this.Stream);
    if (parseInt(P, 10) != this.FirstPagesID) {
      this.LoadError(PDFDESIGNER_ERROR_004);
    }

    while (true) {
      P = PDF_GetString(this.Stream);
      // コメントスキップ -----------------------------------------------------
      if (P == "%") {
        PDF_CommnetSkip(this.Stream);
        // ページ数の取得 -------------------------------------------------------
      } else if (P == "/Count") {
        this.PageCount = this.GetObjectType_Integer();
        // オブジェクトの終了 ---------------------------------------------------
      } else if (P == "endobj") {
        break;
      }
    }
    this.Stream.Pos = PrePos;
  },

  // Document Catalogの情報を取得する
  GetDocumentCatalogInfo: function () {
    var P, S;
    var StreamSize, PrePos;

    StreamSize = 0;

    PrePos = this.Stream.Pos;
    this.Stream.Pos = parseInt(this.ObjectPosArray[this.RootID], 10);

    // オブジェクトIDのチェック
    S = PDF_GetString(this.Stream);
    if (parseInt(S, 10) != this.RootID) {
      this.LoadError(PDFDESIGNER_ERROR_004);
    }

    while (true) {
      S = PDF_GetString(this.Stream);
      // コメントスキップ -----------------------------------------------------
      if (S == "%") {
        PDF_CommnetSkip(this.Stream);
        // タグ付きPDF ----------------------------------------------------------
      } else if (S == "/StructTreeRoot") {
        this.Tag = true;
        // しおりのIDを取得 -----------------------------------------------------
      } else if (S == "/Outlines") {
        P = PDF_GetString(this.Stream);
        this.OutlinesID = PDF_StrToIntDef(P, -1);
        // PagesのIDを取得 ------------------------------------------------------
      } else if (S == "/Pages") {
        P = PDF_GetString(this.Stream);
        this.FirstPagesID = PDF_StrToIntDef(P, -1);
        // MetadataのIDを取得 ---------------------------------------------------
      } else if (S == "/Metadata") {
        P = PDF_GetString(this.Stream);
        this.MetadataID = PDF_StrToIntDef(P, -1);
        // テキストをスキップ ---------------------------------------------------
      } else if (S == "(") {
        PDF_TextSkip(this.Stream);
        // ストリームのサイズを取得----------------------------------------------
      } else if (S == "/Length") {
        StreamSize = this.GetObjectType_Integer();
        // ストリームをスキップ -------------------------------------------------
      } else if (S == "stream") {
        P = this.Stream.ReadString(1);
        if (P == "\r") {
          P = this.Stream.ReadString(1);
        }
        this.Stream.Pos = this.Stream.Pos + StreamSize;
        // オブジェクトの終了 ---------------------------------------------------*)
      } else if (S == "endobj") {
        break;
      }
    }
    this.Stream.Pos = PrePos;
  },

  LoadFromFile: function (FileName) {
    throw PDFDESIGNER_ERROR_003;
  },

  LoadFromStream: function (AStream) {
    var XrefCount; // xrefの項目数
    var XrefTop; // xrefの先頭オブジェクト番号

    // 相互参照テーブルの取得
    function GetCrossReferenceTable(PDFAnalyst, xrefID) {
      var P, O, D;
      var PrevID;
      var PrePos;

      // Web用に最適化 -);
      PDFAnalyst.XrefTableList[PDFAnalyst.XrefTableList.length] = xrefID;
      if (xrefID == 173) PDFAnalyst.Optimize = true;

      PrevID = -1;
      PDFAnalyst.Stream.Pos = parseInt(xrefID, 10);

      // xrefチェック -----------------------------------------------------
      P = PDFAnalyst.Stream.ReadString(4);
      if (P != "xref") {
        PDFAnalyst.LoadError(PDFDESIGNER_ERROR_007);
      }

      // サブセクションの取得 ---------------------------------------------
      while (true) {
        // 先頭オブジェクト番号
        XrefTop = PDF_GetString(PDFAnalyst.Stream);
        if (XrefTop.match(/[^0-9]+/)) {
          PDFAnalyst.LoadError(PDFDESIGNER_ERROR_008);
        }
        XrefTop = parseInt(XrefTop, 10);

        // サブセクションの項目数
        XrefCount = PDF_GetString(PDFAnalyst.Stream);
        if (XrefCount.match(/[^0-9]+/)) {
          PDFAnalyst.LoadError(PDFDESIGNER_ERROR_009);
        }
        XrefCount = parseInt(XrefCount, 10);

        // 初期時
        if (PDFAnalyst.ObjectCount == -1) {
          PDFAnalyst.ObjectCount = XrefTop + XrefCount;
        } else {
          if (XrefTop + XrefCount > PDFAnalyst.ObjectCount) {
            (PDFAnalyst.ObjectCount = XrefTop + XrefCount), 10;
          }
        }

        // 相互参照テーブルを列挙する
        PDF_SeekPos(PDFAnalyst.Stream);
        for (var i = 0; i < XrefCount; i++) {
          // 本来は常に20byteが一行となるが多少の誤差が合っても読み込めるようにする
          O = PDFAnalyst.Stream.ReadString(10);
          D = PDFAnalyst.Stream.ReadString(8);
          P = PDFAnalyst.Stream.ReadString(1);

          if (P == "\r" || P == " ") {
            P = PDFAnalyst.Stream.ReadString(1);
            if (!(P == "\n" || P == "\r")) {
              PDFAnalyst.Stream.Pos = PDFAnalyst.Stream.Pos - 1;
            }
          }

          // 値が入っていない場合(古いアドレスには書き換えない)
          if (PDFAnalyst.ObjectPosArray[XrefTop + i] == undefined) {
            if (O.match(/[^0-9]+/)) {
              PDFAnalyst.LoadError(PDFDESIGNER_ERROR_009);
            }
            PDFAnalyst.ObjectPosArray[XrefTop + i] = O;
          }

          // このオブジェクトは削除済みオブジェクトである
          if (D[7] == "f") {
            PDFAnalyst.DeleteObject[XrefTop + i] = true;
          } else {
            PDFAnalyst.DeleteObject[XrefTop + i] = false;
          }
        }

        // trailerがでたら抜ける
        PrePos = PDFAnalyst.Stream.Pos;
        P = PDF_GetString(PDFAnalyst.Stream);

        if (P == "trailer") {
          break;
        } else {
          PDFAnalyst.Stream.Pos = PrePos;
        }
      }

      // trailerの処理 ----------------------------------------------------

      // << まで移動
      PDF_SeekPos(PDFAnalyst.Stream);
      P = PDFAnalyst.Stream.ReadString(2);
      if (P != "<<") {
        PDFAnalyst.LoadError(PDFDESIGNER_ERROR_010);
      }

      // >> がでるまでループ
      while (true) {
        P = PDF_GetString(PDFAnalyst.Stream);

        // Root  カタログオブジェクトへの位置
        if (P == "/Root") {
          P = PDF_GetString(PDFAnalyst.Stream);
          if (PDFAnalyst.RootID == -1) {
            PDFAnalyst.RootID = P;
            if (PDFAnalyst.RootID.match(/[^0-9]+/)) {
              PDFAnalyst.LoadError(PDFDESIGNER_ERROR_011);
            }
            PDFAnalyst.RootID = parseInt(PDFAnalyst.RootID, 10);
          }
          // Prev  これ以外にもxrefがある
        } else if (P == "/Prev") {
          P = PDF_GetString(PDFAnalyst.Stream);
          PrevID = P;
          if (PrevID.match(/[^0-9]+/)) {
            PDFAnalyst.LoadError(PDFDESIGNER_ERROR_012);
          }
          PrevID = parseInt(PrevID, 10);
          // info 書類情報への位置
        } else if (P == "/Info") {
          P = PDF_GetString(PDFAnalyst.Stream);
          if (PDFAnalyst.InfoID == -1) {
            PDFAnalyst.InfoID = P;
            if (PDFAnalyst.InfoID.match(/[^0-9]+/)) {
              PDFAnalyst.LoadError(PDFDESIGNER_ERROR_013);
            }
            PDFAnalyst.InfoID = parseInt(PDFAnalyst.InfoID, 10);
          }
          // Encrypt ファイルは暗号化されている
        } else if (P == "/Encrypt") {
          PDFAnalyst.Encrypt = true;
        } else if (P == "startxref") {
          break;
        }
      }

      // 次のxrefがある場合は再帰処理
      if (PrevID != -1) GetCrossReferenceTable(PDFAnalyst, PrevID);
    }

    var P;

    this.Stream = new TReadStream(AStream);

    if (this.Stream.FileSize < 5) {
      this.LoadError(PDFDESIGNER_ERROR_014);
    }

    // %PDFチェック -----------------------------------------------------------------

    P = this.Stream.ReadString(5);
    if (P != "%PDF-") {
      this.LoadError(PDFDESIGNER_ERROR_015);
    }

    this.Version = PDF_GetString(this.Stream);

    if (this.Version.length < 3) {
      this.LoadError(PDFDESIGNER_ERROR_015);
    }

    // 本来はココでPDFバージョンの確認をしますが、あえて確認しません :-)
    // というのは、実質はPDF1.4形式なのにPDF1.6形式などと詐称している場合があるからです。
    //if (PDF_StrToIntDef((this.Version[0] + this.Version[2]), 15) >= 15)
    //    throw 'This file is unsupported.';

    // %%EOFチェック -----------------------------------------------------------------

    var counter = 1;
    while (true) {
      this.Stream.Pos = this.Stream.FileSize - counter;
      P = this.Stream.ReadString(1);
      if (!(P == "\n" || P == "\r" || P == " ")) {
        this.Stream.Pos = this.Stream.Pos - "%%EOF".length;
        break;
      }
      counter++;
    }

    P = this.Stream.ReadString(5);
    if (P != "%%EOF") {
      this.LoadError(PDFDESIGNER_ERROR_016);
    }

    this.Stream.Pos = this.Stream.Pos - 5;

    // 相互参照テーブルの位置を取得 --------------------------------------------------
    var S = "";

    // CR/LFと空白は読み飛ばす
    while (true) {
      this.Stream.Pos = this.Stream.Pos - 1;
      P = this.Stream.ReadString(1);
      if (!(P == "\n" || P == "\r" || P == " ")) break;
      this.Stream.Pos = this.Stream.Pos - 1;
    }

    // Xrefの位置を取得
    while (true) {
      this.Stream.Pos = this.Stream.Pos - 1;
      P = this.Stream.ReadString(1);
      if (P == "\n" || P == "\r" || P == " ") break;
      this.Stream.Pos = this.Stream.Pos - 1;
      S = P + S;
    }

    if (S.match(/[^0-9]+/)) {
      this.LoadError(PDFDESIGNER_ERROR_017);
    }

    // 相互参照テーブルを取得 --------------------------------------------------------
    var XrefPos = parseInt(S, 10);
    GetCrossReferenceTable(this, XrefPos);

    // 付属情報を取得 ----------------------------------------------------------------

    // Document Catalogの情報を取得する
    if (this.RootID == -1) {
      this.LoadError(PDFDESIGNER_ERROR_018);
    }
    this.GetDocumentCatalogInfo();

    // ページ数の取得する
    if (this.FirstPagesID == -1) {
      this.LoadError(PDFDESIGNER_ERROR_019);
    }
    this.GetPageCount();

    // 最初のページのサイズを取得する
    if (this.FirstPagesID != -1) {
      this.GetFirstPageSize();
    }
  },
};

////////////////////////////////////////////////////////////////////////////////
// TPDFParser
////////////////////////////////////////////////////////////////////////////////

// ---------------------
//  TPDFParser
// ---------------------
function TPDFParser(ObjectMem, PageList) {
  // Praivate
  this._PageList = PageList;
  this._ObjectMem = ObjectMem;
}

// ---------------------
//  TPDFParser.Method
// ---------------------
TPDFParser.prototype = {
  // ページで使用されているリソース辞書または参照を丸ごと取得
  PDFPage_GetResourceStream: function (PDFAnalyst, PageID) {
    var P, C;
    var ResourceBool = false;
    var PrePos, ResPos, ResSize;
    var ParentID = -1;
    var StreamSize = 0;
    var Result = null;

    if (!PDFAnalyst.IsObjectID(PageID)) return Result;

    PrePos = PDFAnalyst.Stream.Pos;
    PDFAnalyst.Stream.Pos = parseInt(PDFAnalyst.ObjectPosArray[PageID], 10);

    while (true) {
      P = PDF_GetString(PDFAnalyst.Stream);
      // コメントスキップ -------------------------------------------------
      if (P == "%") {
        PDF_CommnetSkip(PDFAnalyst.Stream);
        // テキストをスキップ -----------------------------------------------
      } else if (P == "(") {
        PDF_TextSkip(PDFAnalyst.Stream);
        // Parentの取得 -----------------------------------------------------
      } else if (P == "/Parent") {
        P = PDF_GetString(PDFAnalyst.Stream);
        ParentID = PDF_StrToIntDef(P, -1);
        // リソースの取得   -------------------------------------------------
      } else if (P == "/Resources") {
        // 「 <<  ..  >> 」 または「 x x R 」 を取得
        P = PDF_GetString(PDFAnalyst.Stream);

        // 辞書型
        if (P == "<") {
          PDFAnalyst.Stream.Pos = PDFAnalyst.Stream.Pos - 1;
          ResPos = PDFAnalyst.Stream.Pos;
          // ディレクトリのスキップ
          PDF_DictionarySkip(PDFAnalyst.Stream);
          // 参照型
        } else {
          ResPos = PDFAnalyst.Stream.Pos - P.length;
          while (true) {
            P = PDF_GetString(PDFAnalyst.Stream);
            if (P == "R") break;
          }
        }

        // リソースのサイズ
        ResSize = PDFAnalyst.Stream.Pos - ResPos;

        // ストリームにコピー
        PDFAnalyst.Stream.Pos = ResPos;
        Result = new TMemoryStream(PDFAnalyst.Stream, ResPos, ResPos + ResSize);
        PDFAnalyst.Stream.Pos = ResSize;

        ResourceBool = true;

        break;
        // ストリームのサイズを取得------------------------------------------
      } else if (P == "/Length") {
        StreamSize = PDFAnalyst.GetObjectType_Integer(PDFAnalyst.Stream);
        // ストリームをスキップ ---------------------------------------------
      } else if (P == "stream") {
        C = PDFAnalyst.Stream.ReadString(1);
        if (C == "\r") {
          PDFAnalyst.Stream.ReadString(1);
        }
        PDFAnalyst.Stream.Pos = PDFAnalyst.Stream.Pos + StreamSize;
        // オブジェクトの終了 -----------------------------------------------
      } else if (P == "endobj") {
        break;
      }
    }

    // 親ページにある場合はそちらにとりに行く
    if (!ResourceBool && ParentID != -1) {
      Result = this.PDFPage_GetResourceStream(PDFAnalyst, ParentID);
    }

    PDFAnalyst.Stream.Pos = PrePos;

    return Result;
  },

  // ページで使用されるコンテンツ配列を取得
  PDFPage_GetContentsStream: function (PDFAnalyst, PageID) {
    var P, C;
    var PrePos, ResPos, ResSize;
    var StreamSize = 0;
    var Result = null;

    if (!PDFAnalyst.IsObjectID(PageID)) return Result;

    PrePos = PDFAnalyst.Stream.Pos;
    PDFAnalyst.Stream.Pos = parseInt(PDFAnalyst.ObjectPosArray[PageID], 10);

    while (true) {
      P = PDF_GetString(PDFAnalyst.Stream);
      // コメントスキップ -------------------------------------------------
      if (P == "%") {
        PDF_CommnetSkip(PDFAnalyst.Stream);
        // テキストをスキップ -----------------------------------------------
      } else if (P == "(") {
        PDF_TextSkip(PDFAnalyst.Stream);
        // コンテンツの取得   -----------------------------------------------
      } else if (P == "/Contents") {
        P = PDF_GetString(PDFAnalyst.Stream);

        // 配列型
        if (P == "[") {
          PDFAnalyst.Stream.Pos = PDFAnalyst.Stream.Pos - 1;
          ResPos = PDFAnalyst.Stream.Pos;
          // 配列のスキップ
          PDF_ArraySkip(PDFAnalyst.Stream);
          // 参照型
        } else {
          ResPos = PDFAnalyst.Stream.Pos - P.length;
          while (true) {
            P = PDF_GetString(PDFAnalyst.Stream);
            if (P == "R") break;
          }
        }

        // コンテンツのサイズ
        ResSize = PDFAnalyst.Stream.Pos - ResPos;

        // ストリームにコピー
        PDFAnalyst.Stream.Pos = ResPos;
        Result = new TMemoryStream(PDFAnalyst.Stream, ResPos, ResPos + ResSize);
        PDFAnalyst.Stream.Pos = ResSize;

        break;
        // ストリームのサイズを取得------------------------------------------
      } else if (P == "/Length") {
        StreamSize = PDFAnalyst.GetObjectType_Integer(PDFAnalyst.Stream);
        // ストリームをスキップ ---------------------------------------------
      } else if (P == "stream") {
        C = PDFAnalyst.Stream.ReadString(1);
        if (C == "\r") {
          PDFAnalyst.Stream.ReadString(1);
        }
        PDFAnalyst.Stream.Pos = PDFAnalyst.Stream.Pos + StreamSize;
        // オブジェクトの終了 -----------------------------------------------
      } else if (P == "endobj") {
        break;
      }
    }

    PDFAnalyst.Stream.Pos = PrePos;

    return Result;
  },

  // ページで使用されている回転角度を取得
  PDFPage_GetRotate: function (PDFAnalyst, PageID) {
    var P, C;
    var RotateBool = false;
    var PrePos;
    var ParentID = -1;
    var StreamSize = 0;
    var Result = 0;

    if (!PDFAnalyst.IsObjectID(PageID)) return Result;

    PrePos = PDFAnalyst.Stream.Pos;
    PDFAnalyst.Stream.Pos = parseInt(PDFAnalyst.ObjectPosArray[PageID], 10);

    while (true) {
      P = PDF_GetString(PDFAnalyst.Stream);
      // コメントスキップ -------------------------------------------------
      if (P == "%") {
        PDF_CommnetSkip(PDFAnalyst.Stream);
        // テキストをスキップ -----------------------------------------------
      } else if (P == "(") {
        PDF_TextSkip(PDFAnalyst.Stream);
        // Parentの取得 -----------------------------------------------------
      } else if (P == "/Parent") {
        P = PDF_GetString(PDFAnalyst.Stream);
        ParentID = PDF_StrToIntDef(P, -1);
        // 回転角度の取得   -------------------------------------------------
      } else if (P == "/Rotate") {
        Result = PDF_StrToIntDef(PDF_GetString(PDFAnalyst.Stream), 0);
        RotateBool = true;
        break;
        // ストリームのサイズを取得------------------------------------------
      } else if (P == "/Length") {
        StreamSize = PDFAnalyst.GetObjectType_Integer(PDFAnalyst.Stream);
        // ストリームをスキップ ---------------------------------------------
      } else if (P == "stream") {
        C = PDFAnalyst.Stream.ReadString(1);
        if (C == "\r") {
          PDFAnalyst.Stream.ReadString(1);
        }
        PDFAnalyst.Stream.Pos = PDFAnalyst.Stream.Pos + StreamSize;
        // オブジェクトの終了 -----------------------------------------------
      } else if (P == "endobj") {
        break;
      }
    }

    // 親ページにある場合はそちらにとりに行く
    if (!RotateBool && ParentID != -1) {
      Result = this.PDFPage_GetRotate(PDFAnalyst, ParentID);
    }

    PDFAnalyst.Stream.Pos = PrePos;

    return Result;
  },

  // Dummyのinfoを書き込む
  WriteDummyInfo: function (PDFAnalyst, AStream) {
    var P;
    var PrePos, Size, wSize;
    var MemoryStream = new TMemoryStream(AStream, 0, AStream.getFileSize());

    Size = PDFAnalyst.GetObjectSize(PDFAnalyst.InfoID);
    MemoryStream.Pos = parseInt(PDFAnalyst.ObjectPosArray[PDFAnalyst.InfoID], 10);

    // 1行目のobjまでスキップ
    PrePos = MemoryStream.Pos;
    PDF_GetString(MemoryStream);
    PDF_GetString(MemoryStream);
    PDF_GetString(MemoryStream);

    // '\n<<\n'
    MemoryStream.Stream[MemoryStream.Pos + 0] = 0x0a;
    MemoryStream.Stream[MemoryStream.Pos + 1] = 0x3c;
    MemoryStream.Stream[MemoryStream.Pos + 2] = 0x3c;
    MemoryStream.Stream[MemoryStream.Pos + 3] = 0x0a;
    MemoryStream.Pos = MemoryStream.Pos + "\n<<\n".length;

    wSize = MemoryStream.Pos - PrePos;

    // 空白の書き込み
    P = "";
    for (var i = 0; i < Size - wSize; i++) {
      MemoryStream.Stream[MemoryStream.Pos + i] = 0x20;
      P = P + " ";
    }
    MemoryStream.Pos = MemoryStream.Pos + P.length;

    // endobjの書き込み
    MemoryStream.Pos = MemoryStream.Pos - "\n>>\nendobj".length;

    // '\n>>\n'
    MemoryStream.Stream[MemoryStream.Pos + 0] = 0x0a;
    MemoryStream.Stream[MemoryStream.Pos + 1] = 0x3e;
    MemoryStream.Stream[MemoryStream.Pos + 2] = 0x3e;
    MemoryStream.Stream[MemoryStream.Pos + 3] = 0x0a;

    // 'endobj'
    MemoryStream.Stream[MemoryStream.Pos + 4] = 0x65;
    MemoryStream.Stream[MemoryStream.Pos + 5] = 0x6e;
    MemoryStream.Stream[MemoryStream.Pos + 6] = 0x64;
    MemoryStream.Stream[MemoryStream.Pos + 7] = 0x6f;
    MemoryStream.Stream[MemoryStream.Pos + 8] = 0x62;
    MemoryStream.Stream[MemoryStream.Pos + 9] = 0x6a;

    // TFileStreamの書き換え
    AStream.Rewrite(MemoryStream);
  },

  // ビューの書き込み
  Write_ViewerPreferences: function (AStream, View) {
    if (
      View.ViewerPreferences.HideToolbar ||
      View.ViewerPreferences.HideMenubar ||
      View.ViewerPreferences.HideWindowUI ||
      View.ViewerPreferences.Direction ||
      View.ViewerPreferences.FitWindow ||
      View.ViewerPreferences.CenterWindow ||
      View.ViewerPreferences.DisplayDocTitle ||
      View.PageMode == TPDFPageMode.pmFullScreen
    ) {
      AStream.WriteString("/ViewerPreferences <<");

      if (View.ViewerPreferences.HideToolbar) AStream.WriteString(" /HideToolbar true"); // ツールバーを非表示
      if (View.ViewerPreferences.HideMenubar) AStream.WriteString(" /HideMenubar true"); // メニューバーを非表示
      if (View.ViewerPreferences.HideWindowUI) AStream.WriteString(" /HideWindowUI true"); // ウインドウコントロールを非表示
      if (View.ViewerPreferences.FitWindow) AStream.WriteString(" /FitWindow true"); // 幅に合わせる
      if (View.ViewerPreferences.CenterWindow) AStream.WriteString(" /CenterWindow true"); // ウインドウをセンタリングする
      if (View.ViewerPreferences.DisplayDocTitle) AStream.WriteString(" /DisplayDocTitle true"); // 文書のタイトルを表示する
      if (View.ViewerPreferences.Direction) AStream.WriteString(" /Direction /R2L"); // 綴じ方(右)

      // フルスクリーン
      if (View.PageMode == TPDFPageMode.pmFullScreen) {
        if (View.ViewerPreferences.NonFullScreenPageMode == TPDFPageMode.pmUseOutlines) {
          // しおり
          AStream.WriteString(" /NonFullScreenPageMode /UseOutlines");
        } else if (View.ViewerPreferences.NonFullScreenPageMode == TPDFPageMode.pmUseThumbs) {
          // サムネイル
          AStream.WriteString(" /NonFullScreenPageMode /UseThumbs");
        }
      }
      AStream.WriteString(" >>\n");
    }
  },

  // ページレイアウトの書き込み
  Write_PageLayout: function (AStream, View) {
    // 単一
    if (View.PageLayout == TPDFPageLayout.plSinglePage) {
      AStream.WriteString("/PageLayout /SinglePage\n");
      // 連続
    } else if (View.PageLayout == TPDFPageLayout.plOneColumn) {
      AStream.WriteString("/PageLayout /OneColumn\n");
      // 見開き
    } else if (View.PageLayout == TPDFPageLayout.plTwoColumnLeft) {
      AStream.WriteString("/PageLayout /TwoColumnLeft\n");
      // 見開き
    } else if (View.PageLayout == TPDFPageLayout.plTwoColumnRight) {
      AStream.WriteString("/PageLayout /TwoColumnRight\n");
    }
  },

  // ページモードの書き込み
  Write_PageMode: function (AStream, View) {
    // しおり
    if (View.PageMode == TPDFPageMode.pmUseOutlines) {
      AStream.WriteString("/PageMode /UseOutlines\n");
      // サムネイル
    } else if (View.PageMode == TPDFPageMode.pmUseThumbs) {
      AStream.WriteString("/PageMode /UseThumbs\n");
      // フルスクリーン
    } else if (View.PageMode == TPDFPageMode.pmFullScreen) {
      AStream.WriteString("/PageMode /FullScreen\n");
    }
  },

  // PDFヘッダの書き込み
  WritePDFHedaer: function (AStream, ObjectMem, View, ObjectID) {
    function Write_OpenAction() {
      // 最初に表示するオブジェクト番号
      var PageID = parseInt(ObjectID, 10);
      // 世代番号
      var GenerationID = 0;

      // 倍率指定
      if (View.OpenAction.SubType == TPDFOpenActionType.oaXYZ) {
        if (View.OpenAction.Zoom == 16) {
          AStream.WriteString("/OpenAction [" + PageID + " " + GenerationID + " R /XYZ -32768 -32768 16 ]\n");
        } else if (View.OpenAction.Zoom == 8) {
          AStream.WriteString("/OpenAction [" + PageID + " " + GenerationID + " R /XYZ -32768 -32768 8 ]\n");
        } else if (View.OpenAction.Zoom == 4) {
          AStream.WriteString("/OpenAction [" + PageID + " " + GenerationID + " R /XYZ -32768 -32768 4 ]\n");
        } else if (View.OpenAction.Zoom == 2) {
          AStream.WriteString("/OpenAction [" + PageID + " " + GenerationID + " R /XYZ -32768 -32768 2 ]\n");
        } else if (View.OpenAction.Zoom == 1.5) {
          AStream.WriteString("/OpenAction [" + PageID + " " + GenerationID + " R /XYZ -32768 -32768 1.5 ]\n");
        } else if (View.OpenAction.Zoom == 1.25) {
          AStream.WriteString("/OpenAction [" + PageID + " " + GenerationID + " R /XYZ -32768 -32768 1.25 ]\n");
        } else if (View.OpenAction.Zoom == 1) {
          AStream.WriteString("/OpenAction [" + PageID + " " + GenerationID + " R /XYZ -32768 -32768 1 ]\n");
        } else if (View.OpenAction.Zoom == 0.75) {
          AStream.WriteString("/OpenAction [" + PageID + " " + GenerationID + " R /XYZ -32768 -32768 0.75 ]\n");
        } else if (View.OpenAction.Zoom == 0.5) {
          AStream.WriteString("/OpenAction [" + PageID + " " + GenerationID + " R /XYZ -32768 -32768 0.5 ]\n");
        } else if (View.OpenAction.Zoom == 0.25) {
          AStream.WriteString("/OpenAction [" + PageID + " " + GenerationID + " R /XYZ -32768 -32768 0.25 ]\n");
        }
        // 描画領域の幅に合わせる
      } else if (View.OpenAction.SubType == TPDFOpenActionType.oaFitBH) {
        AStream.WriteString("/OpenAction [" + PageID + " " + GenerationID + " R /FitBH -32768 ]\n");
        // 全体表示
      } else if (View.OpenAction.SubType == TPDFOpenActionType.oaFit) {
        AStream.WriteString("/OpenAction [" + PageID + " " + GenerationID + " R /Fit]\n");
        // 幅に合わせる
      } else if (View.OpenAction.SubType == TPDFOpenActionType.oaFitH) {
        AStream.WriteString("/OpenAction [" + PageID + " " + GenerationID + " R /FitH -32768]\n");
        // デフォルト
      } else {
        // 最初のページでないならば
        if (PageID != parseInt(ObjectID, 10)) {
          AStream.WriteString("/OpenAction [" + PageID + " " + GenerationID + " R /XYZ null null null ]\n");
        }
      }
    }

    var i = 0;

    // カタログ ----------------------------------------------------------------
    this._ObjectMem.ObjectPosArray[i] = AStream.getFileSize();
    AStream.WriteString("1 0 obj\n");
    AStream.WriteString("<<\n");
    AStream.WriteString("/Type /Catalog\n");
    AStream.WriteString("/Pages 2 0 R\n");

    // 表示オプション
    this.Write_ViewerPreferences(AStream, View);
    this.Write_PageMode(AStream, View);
    this.Write_PageLayout(AStream, View);
    Write_OpenAction();

    AStream.WriteString(">>\n");
    AStream.WriteString("endobj\n");

    i++;

    // 親ページ ----------------------------------------------------------------
    this._ObjectMem.ObjectPosArray[i] = AStream.getFileSize();

    AStream.WriteString("2 0 obj\n");
    AStream.WriteString("<<\n");
    AStream.WriteString("/Type /Pages\n");

    // ページ数
    AStream.WriteString("/Kids [");

    for (var i = 0; i < this._PageList.length; i++) {
      AStream.WriteString(" " + this._PageList[i] + " 0 R");
    }
    AStream.WriteString(" ]\n");

    AStream.WriteString("/Count " + this._PageList.length + "\n");

    AStream.WriteString(">>\n");
    AStream.WriteString("endobj\n");
  },

  // PDFヘッダの書き込み
  WritePDFHedaer_Maker: function (PDFAnalyst, AStream, ObjectMem, View, OutLine) {
    var PrePos;

    // ストリームのコピー
    function CopyStream() {
      var NextPos;

      if (PDFAnalyst.Stream.Pos == PrePos) return;

      NextPos = PDFAnalyst.Stream.Pos;
      PDFAnalyst.Stream.Pos = PrePos;
      AStream.WriteStream(PDFAnalyst.Stream, PrePos, NextPos);
      PDFAnalyst.Stream.Pos = PDFAnalyst.Stream.Pos + (NextPos - PrePos);
    }

    function Write_OpenAction() {
      var PageID, GenerationID;

      // 最初に表示するオブジェクト番号
      if (View.OpenAction.ObjectID != -1) {
        PageID = parseInt(View.OpenAction.ObjectID, 10);
      } else {
        PageID = PDFAnalyst.FirstPageID;
      }

      // 世代番号の取得
      GenerationID = PDFAnalyst.GetGenerationID(PageID);

      // 倍率指定
      if (View.OpenAction.SubType == TPDFOpenActionType.oaXYZ) {
        if (View.OpenAction.Zoom == 16) {
          AStream.WriteString("/OpenAction [" + PageID + " " + GenerationID + " R /XYZ -32768 -32768 16 ]\n");
        } else if (View.OpenAction.Zoom == 8) {
          AStream.WriteString("/OpenAction [" + PageID + " " + GenerationID + " R /XYZ -32768 -32768 8 ]\n");
        } else if (View.OpenAction.Zoom == 4) {
          AStream.WriteString("/OpenAction [" + PageID + " " + GenerationID + " R /XYZ -32768 -32768 4 ]\n");
        } else if (View.OpenAction.Zoom == 2) {
          AStream.WriteString("/OpenAction [" + PageID + " " + GenerationID + " R /XYZ -32768 -32768 2 ]\n");
        } else if (View.OpenAction.Zoom == 1.5) {
          AStream.WriteString("/OpenAction [" + PageID + " " + GenerationID + " R /XYZ -32768 -32768 1.5 ]\n");
        } else if (View.OpenAction.Zoom == 1.25) {
          AStream.WriteString("/OpenAction [" + PageID + " " + GenerationID + " R /XYZ -32768 -32768 1.25 ]\n");
        } else if (View.OpenAction.Zoom == 1) {
          AStream.WriteString("/OpenAction [" + PageID + " " + GenerationID + " R /XYZ -32768 -32768 1 ]\n");
        } else if (View.OpenAction.Zoom == 0.75) {
          AStream.WriteString("/OpenAction [" + PageID + " " + GenerationID + " R /XYZ -32768 -32768 0.75 ]\n");
        } else if (View.OpenAction.Zoom == 0.5) {
          AStream.WriteString("/OpenAction [" + PageID + " " + GenerationID + " R /XYZ -32768 -32768 0.5 ]\n");
        } else if (View.OpenAction.Zoom == 0.25) {
          AStream.WriteString("/OpenAction [" + PageID + " " + GenerationID + " R /XYZ -32768 -32768 0.25 ]\n");
        }
        // 描画領域の幅に合わせる
      } else if (View.OpenAction.SubType == TPDFOpenActionType.oaFitBH) {
        AStream.WriteString("/OpenAction [" + PageID + " " + GenerationID + " R /FitBH -32768 ]\n");
        // 全体表示
      } else if (View.OpenAction.SubType == TPDFOpenActionType.oaFit) {
        AStream.WriteString("/OpenAction [" + PageID + " " + GenerationID + " R /Fit]\n");
        // 幅に合わせる
      } else if (View.OpenAction.SubType == TPDFOpenActionType.oaFitH) {
        AStream.WriteString("/OpenAction [" + PageID + " " + GenerationID + " R /FitH -32768]\n");
        // デフォルト
      } else {
        // 最初のページでないならば
        if (PageID != PDFAnalyst.FirstPageID) {
          AStream.WriteString("/OpenAction [" + PageID + " " + GenerationID + " R /XYZ null null null ]\n");
        }
      }
    }

    // しおりの書き込み
    function Write_Outlines() {
      AStream.WriteString("/Outlines " + (PDFAnalyst.ObjectPosArray.length + 1) + " 0 R\n");
    }

    // 指定された文字が出るまでループ
    function fooSkip(C) {
      while (true) {
        if (C == PDF_GetString(PDFAnalyst.Stream)) break;
      }
    }

    var P, C;
    var AOpenAction = false;
    var APageMode = false;
    var APageLayout = false;
    var AViewerPreferences = false;
    var AOutlines = false;

    PDFAnalyst.Stream.Pos = parseInt(PDFAnalyst.ObjectPosArray[PDFAnalyst.RootID], 10);

    ObjectMem.ObjectPosArray[ObjectMem.ObjectIndex] = AStream.Pos;
    PDF_TopLineSkip(PDFAnalyst.Stream);

    // 先頭のIDを書き込む
    AStream.WriteString(ObjectMem.ObjectIndex + 1 + " 0 obj\n");

    while (true) {
      PrePos = PDFAnalyst.Stream.Pos;

      P = PDF_GetString(PDFAnalyst.Stream);
      if (P == "") continue;

      // コメントのスキップ -----------------------------------------
      if (P == "%") {
        PDF_CommnetSkip(PDFAnalyst.Stream);
        continue;
        // テキストのスキップ -----------------------------------------
      } else if (P == "(") {
        PDF_TextSkip(PDFAnalyst.Stream);
        // OpenAction  ------------------------------------------------
      } else if (P == "/OpenAction") {
        // 前の位置に戻してその部分まで新しいファイルにコピー
        PDFAnalyst.Stream.Pos = PDFAnalyst.Stream.Pos - "/OpenAction".length;
        CopyStream();

        // 変更した情報を書き込む
        Write_OpenAction();

        // 以前の情報はスキップする
        PDFAnalyst.Stream.Pos = PDFAnalyst.Stream.Pos + "/OpenAction".length;

        P = PDF_GetString(PDFAnalyst.Stream);

        // 配列
        if (P == "[") {
          PDF_ArraySkip(PDFAnalyst.Stream);
          // インレダイレクトオブジェクト
        } else if (P[0].match(/[1-9]+/)) {
          fooSkip("R");
          // 辞書
        } else if (P == "<") {
          PDFAnalyst.Stream.Pos = PDFAnalyst.Stream.Pos + 1;
          PDF_DictionarySkip(PDFAnalyst.Stream);
        }

        AOpenAction = true;
        continue;
        // PageMode ---------------------------------------------------
      } else if (P == "/PageMode") {
        // 前の位置に戻してその部分まで新しいファイルにコピー
        PDFAnalyst.Stream.Pos = PDFAnalyst.Stream.Pos - "/PageMode".length;
        CopyStream();
        // 変更した情報を書き込む
        this.Write_PageMode(AStream, View);

        // 以前の情報はスキップする
        PDFAnalyst.Stream.Pos = PDFAnalyst.Stream.Pos + "/PageMode".length;
        PDF_NameSkip(PDFAnalyst.Stream);

        APageMode = true;
        continue;
        // PageLayout  ------------------------------------------------
      } else if (P == "/PageLayout") {
        // 前の位置に戻してその部分まで新しいファイルにコピー
        PDFAnalyst.Stream.Pos = PDFAnalyst.Stream.Pos - "/PageLayout".length;
        CopyStream();

        // 変更した情報を書き込む
        this.Write_PageLayout(AStream, View);

        // 以前の情報はスキップする
        PDFAnalyst.Stream.Pos = PDFAnalyst.Stream.Pos + "/PageLayout".length;
        PDF_NameSkip(PDFAnalyst.Stream);

        APageLayout = true;
        continue;
        // ViewerPreferences ------------------------------------------
      } else if (P == "/ViewerPreferences") {
        // 前の位置に戻してその部分まで新しいファイルにコピー
        PDFAnalyst.Stream.Pos = PDFAnalyst.Stream.Pos - "/ViewerPreferences".length;
        CopyStream();

        // 変更した情報を書き込む
        this.Write_ViewerPreferences(AStream, View);

        // 以前の情報はスキップする
        PDFAnalyst.Stream.Pos = PDFAnalyst.Stream.Pos + "/ViewerPreferences".length;
        P = PDF_GetString(PDFAnalyst.Stream);

        // インレダイレクトオブジェクト
        if (P[0].match(/[1-9]+/)) {
          fooSkip("R");
          // 辞書
        } else if (P == "<") {
          PDFAnalyst.Stream.Pos = PDFAnalyst.Stream.Pos - 1;
          PDF_DictionarySkip(PDFAnalyst.Stream);
        }

        AViewerPreferences = true;
        continue;
        // Outlines  --------------------------------------------------
      } else if (P == "/Outlines") {
        if (OutLine) {
          // 前の位置に戻してその部分まで新しいファイルにコピー
          PDFAnalyst.Stream.Pos = PDFAnalyst.Stream.Pos - "/Outlines".length;
          CopyStream();

          // 変更した情報を書き込む
          Write_Outlines();

          PDFAnalyst.Stream.Pos = PDFAnalyst.Stream.Pos + "/Outlines".length;

          fooSkip("R");

          AOutlines = true;
          continue;
        }
        // オブジェクトの終端子  --------------------------------------
      } else if (P == "endobj") {
        CopyStream();

        // 書き込んでいないものがある場合
        if (!AOpenAction || !APageMode || (!AOutlines && OutLine) || !APageLayout || !AViewerPreferences) {
          // TFileStreamは読み込み禁止なのでTMemoryStreamに展開
          var MemoryStream = new TMemoryStream(AStream, 0, AStream.getFileSize());
          MemoryStream.Pos = MemoryStream.getFileSize();
          MemoryStream.Pos = MemoryStream.Pos - "endobj".length;

          // >> の前まで戻る
          while (true) {
            C = MemoryStream.ReadString(1);
            if (C == ">") {
              MemoryStream.Pos = MemoryStream.Pos - 2;
              MemoryStream.Stream = MemoryStream.Stream.subarray(0, MemoryStream.Pos);
              break;
            } else {
              MemoryStream.Pos = MemoryStream.Pos - 2;
            }
          }
          // TFileStreamの書き換え
          AStream.Rewrite(MemoryStream);

          AStream.WriteString("\n");

          if (!AOpenAction) Write_OpenAction();
          if (!APageMode) this.Write_PageMode(AStream, View);
          if (!AOutlines && OutLine) Write_Outlines();
          if (!APageLayout) this.Write_PageLayout(AStream, View);
          if (!AViewerPreferences) this.Write_ViewerPreferences(AStream, View);

          AStream.WriteString(">>\n");
          AStream.WriteString("endobj");
        }
        break;
      }
      CopyStream();
    }

    AStream.WriteString("\n");
    ObjectMem.ObjectIndex++;
  },

  // 文書情報の書き込み
  WriteInfo: function (AStream, ObjectMem, Info) {
    var PDFCode = new TPDFCode();

    ObjectMem.ObjectPosArray[ObjectMem.ObjectIndex] = AStream.getFileSize();
    AStream.WriteString(ObjectMem.ObjectIndex + 1 + " 0 obj\n");
    AStream.WriteString("<<\n");

    // 作成者
    if (Info.Author != "") AStream.WriteString("/Author (" + PDFCode.PDFDocEncoding(Info.Author) + ")\n");
    // タイトル
    if (Info.Title != "") AStream.WriteString("/Title (" + PDFCode.PDFDocEncoding(Info.Title) + ")\n");
    // サブタイトル
    if (Info.Subject != "") AStream.WriteString("/Subject (" + PDFCode.PDFDocEncoding(Info.Subject) + ")\n");
    // キーワード
    if (Info.Keywords != "") AStream.WriteString("/Keywords (" + PDFCode.PDFDocEncoding(Info.Keywords) + ")\n");
    // アプリケーション(作成)
    if (Info.Creator != "") AStream.WriteString("/Creator (" + PDFCode.PDFDocEncoding(Info.Creator) + ")\n");
    // PDF変換
    if (Info.Producer != "") AStream.WriteString("/Producer (" + PDFCode.PDFDocEncoding(Info.Producer) + ")\n");
    // 作成日時
    if (Info.CreationDate != "") AStream.WriteString("/CreationDate (" + Info.CreationDate + ")\n");
    // 更新日時
    if (Info.ModDate != "") AStream.WriteString("/ModDate (" + Info.ModDate + ")\n");

    // AStream.WriteString('/CreationDate (D:' + PDF_GetDateTime_Now() + ')\n');
    // AStream.WriteString('/ModDate (D:' + PDF_GetDateTime_Now() + ')\n');

    // 「作成日時/更新日時」は「世界協定時刻(Coordinated Universal Time)」の情報を
    // 付加する事が推奨されていたと思います。例えば Tokyo[ja] だと日付の後ろに +09'00'が付加されます。

    AStream.WriteString(">>\n");
    AStream.WriteString("endobj\n");

    ObjectMem.ObjectIndex++;
  },

  // PDFフッターの書き込み
  WritePDFFooter: function (AStream, Info) {
    function WriteCrossReferenceTable(ObjectMem) {
      var i;

      ObjectMem.ObjectPosArray[ObjectMem.ObjectIndex] = AStream.getFileSize();
      AStream.WriteString("xref\n");
      AStream.WriteString("0 " + (ObjectMem.ObjectIndex + 1) + "\n");
      AStream.WriteString("0000000000 65535 f \n");
      for (var i = 0; i < ObjectMem.ObjectIndex; i++) {
        AStream.WriteString(PDF_ConvertObjectPos([ObjectMem.ObjectPosArray[i]], 10) + " 00000 n \n");
      }
    }

    // Infoの設定
    this.WriteInfo(AStream, this._ObjectMem, Info);

    // クロスレファレンステーブルの設定
    WriteCrossReferenceTable(this._ObjectMem);

    // トレイヤーの設定
    AStream.WriteString("trailer\n");
    AStream.WriteString("<<\n");
    AStream.WriteString("/Size " + (this._ObjectMem.ObjectIndex + 1) + "\n");
    AStream.WriteString("/Info " + this._ObjectMem.ObjectIndex + " 0 R\n");
    AStream.WriteString("/Root 1 0 R\n");
    AStream.WriteString(">>\n");
    AStream.WriteString("startxref\n");
    AStream.WriteString(this._ObjectMem.ObjectPosArray[this._ObjectMem.ObjectIndex] + "\n");
    AStream.WriteString("%%EOF\n");
  },

  // PDFフッターの書き込み
  WritePDFFooter_Maker: function (PDFAnalyst, AStream, ObjectMem, Info) {
    function WriteCrossReferenceTable() {
      var i;

      ObjectMem.ObjectPosArray[ObjectMem.ObjectIndex] = AStream.getFileSize();
      AStream.WriteString("xref\n");
      AStream.WriteString(
        PDFAnalyst.ObjectPosArray.length + " " + (ObjectMem.ObjectIndex + 1 - PDFAnalyst.ObjectPosArray.length) + "\n"
      );
      for (var i = PDFAnalyst.ObjectPosArray.length - 1; i < ObjectMem.ObjectIndex; i++) {
        AStream.WriteString(PDF_ConvertObjectPos([ObjectMem.ObjectPosArray[i]], 10) + " 00000 n \n");
      }
    }

    // Infoの設定
    this.WriteInfo(AStream, ObjectMem, Info);

    // クロスレファレンステーブルの設定
    WriteCrossReferenceTable(ObjectMem);

    // トレイヤーの設定
    AStream.WriteString("trailer\n");
    AStream.WriteString("<<\n");
    AStream.WriteString("/Size " + (ObjectMem.ObjectIndex + 1) + "\n");
    AStream.WriteString("/Info " + ObjectMem.ObjectIndex + " 0 R\n");
    AStream.WriteString("/Root " + PDFAnalyst.ObjectPosArray.length + " 0 R\n");
    AStream.WriteString("/Prev " + PDFAnalyst.XrefTableList[0] + "\n");
    AStream.WriteString(">>\n");
    AStream.WriteString("startxref\n");
    AStream.WriteString(ObjectMem.ObjectPosArray[ObjectMem.ObjectIndex] + "\n");
    AStream.WriteString("%%EOF\n");
  },

  // /Pageオブジェクトで使用しているオブジェクト番号を列挙する
  GetPageInObjectList: function (PDFAnalyst, PageID, StringList) {
    // 重複カット
    function SameValueCut(Value) {
      var Flag = false;
      var Result = new Array();
      var vlen = Value.length;
      var slen = StringList.length;

      for (var i = 0; i < vlen; i++) {
        Flag = false;
        for (var j = 0; j < slen; j++) {
          if (StringList[j] == Value[i]) {
            Flag = true;
            break;
          }
        }

        // 重複していなければ格納
        if (!Flag) {
          Result[Result.length] = Value[i];
        }
      }
      return Result;
    }

    // ストリームの中で定義されているIDを取得
    function GetObjectID_Stream(AStream, ObjectList) {
      var P, C, B1, B2;
      var PreBuffer;
      var PrePos;
      var StreamSize = 0;

      try {
        // 使用されているオブジェクト番号を検索 -----------------------------
        while (true) {
          P = PDF_GetString(AStream);
          if (P == "") continue;

          // コメントのスキップ -------------------------------------------
          if (P == "%") {
            PDF_CommnetSkip(AStream);
            continue;
            // テキストのスキップ -------------------------------------------
          } else if (P == "(") {
            PDF_TextSkip(AStream);
            // オブジェクト番号を取得する -----------------------------------
          } else if (P[0].match(/[1-9]+/)) {
            try {
              // 位置を記憶
              PrePos = AStream.Pos;

              // 世代番号の取得
              B1 = PDF_GetString(AStream);
              if (B1 == "endobj") break;

              // R の取得
              B2 = PDF_GetString(AStream);
              if (B2 == "endobj") break;

              // オブジェクト番号ならば
              if (PDF_StrToIntDef(B1, -1) != -1 && B2 == "R") {
                // 親オブジェクトは無視する
                //if (PreBuffer == '/Parent') {
                //    AStream.Pos = PrePos;
                //     continue;
                // }

                // オブジェクト番号の範囲が不正ならば
                if (!PDFAnalyst.IsObjectID(P)) {
                  AStream.Pos = PrePos;
                  continue;
                }

                ObjectList[ObjectList.length] = parseInt(P, 10);
              } else {
                AStream.Pos = PrePos;
              }
            } catch (e) {
              break;
            }
            // ストリームのサイズを取得 ------------------------------------
          } else if (P == "/Length") {
            StreamSize = PDFAnalyst.GetObjectType_Integer(AStream);
            // ストリームをスキップ ----------------------------------------
          } else if (P == "stream") {
            C = AStream.ReadString(1);
            if (C == "\r") {
              AStream.ReadString(1);
            }
            AStream.Stream.Pos = AStream.Stream.Pos + StreamSize;
            // オブジェクトの終端子 ----------------------------------------
          } else if (P == "endobj") {
            break;
          }

          //PreBuffer = P;
        }
      } catch (e) {
        // 読み込みエラー
      }
    }

    // 再帰的にPDFオブジェクトを探索
    function SeachPDFObject(ObjectID) {
      var P, C, B1, B2;
      var PreBuffer;
      var PrePos, MainPrePos;
      var StreamSize = 0;
      var ObjectList = new Array();

      MainPrePos = PDFAnalyst.Stream.Pos;
      PDFAnalyst.Stream.Pos = parseInt(PDFAnalyst.ObjectPosArray[ObjectID], 10);

      try {
        // 使用されているオブジェクト番号を検索 -----------------------------
        while (true) {
          P = PDF_GetString(PDFAnalyst.Stream);
          if (P == "") continue;

          // コメントのスキップ -------------------------------------------
          if (P == "%") {
            PDF_CommnetSkip(PDFAnalyst.Stream);
            continue;
            // テキストのスキップ -------------------------------------------
          } else if (P == "(") {
            PDF_TextSkip(PDFAnalyst.Stream);
            // オブジェクト番号を取得する -----------------------------------
          } else if (P[0].match(/[1-9]+/)) {
            try {
              // 位置を記憶
              PrePos = PDFAnalyst.Stream.Pos;

              // 世代番号の取得
              B1 = PDF_GetString(PDFAnalyst.Stream);
              if (B1 == "endobj") break;

              // R の取得
              B2 = PDF_GetString(PDFAnalyst.Stream);
              if (B2 == "endobj") break;

              // オブジェクト番号ならば
              if (PDF_StrToIntDef(B1, -1) != -1 && B2 == "R") {
                // 親オブジェクトは無視する
                if (PreBuffer == "/Parent") {
                  PDFAnalyst.Stream.Pos = PrePos;
                  continue;
                }

                // オブジェクト番号の範囲が不正ならば
                if (!PDFAnalyst.IsObjectID(P)) {
                  PDFAnalyst.Stream.Pos = PrePos;
                  continue;
                }

                ObjectList[ObjectList.length] = parseInt(P, 10);
              } else {
                PDFAnalyst.Stream.Pos = PrePos;
              }
            } catch (e) {
              break;
            }
            // ストリームのサイズを取得 ------------------------------------
          } else if (P == "/Length") {
            StreamSize = PDFAnalyst.GetObjectType_Integer(PDFAnalyst.Stream);
            // ストリームをスキップ ----------------------------------------
          } else if (P == "stream") {
            C = PDFAnalyst.Stream.ReadString(1);
            if (C == "\r") {
              PDFAnalyst.Stream.ReadString(1);
            }
            PDFAnalyst.Stream.Pos = PDFAnalyst.Stream.Pos + StreamSize;
            // オブジェクトの終端子 ----------------------------------------
          } else if (P == "endobj") {
            break;
          }
          PreBuffer = P;
        }

        // 発見されたオブジェクトの内部にオブジェクトがあるか検索(再帰) --------

        // 既に検索されているIDを抹消 (高速化)
        ObjectList = SameValueCut(ObjectList);

        if (ObjectList.length != 0) {
          var len = ObjectList.length;
          for (var i = 0; i < len; i++) {
            StringList[StringList.length] = ObjectList[i];
            SeachPDFObject(parseInt(ObjectList[i], 10));
          }
        }
      } finally {
        PDFAnalyst.Stream.Pos = MainPrePos;
      }
    }

    var AStream = null;
    var ObjectList = new Array();

    try {
      // リソース内部のIDを検索 ----------------------------------------------
      AStream = this.PDFPage_GetResourceStream(PDFAnalyst, PageID);
      if (AStream != null) {
        // ストリームの後ろに終端子を追加
        AStream.WriteString("\n endobj\n");
        AStream.Pos = 0;
        GetObjectID_Stream(AStream, ObjectList);
      }

      // コンテンツ配列を検索 ------------------------------------------------
      AStream = this.PDFPage_GetContentsStream(PDFAnalyst, PageID);
      if (AStream != null) {
        // ストリームの後ろに終端子を追加
        AStream.WriteString("\n endobj\n");
        AStream.Pos = 0;
        GetObjectID_Stream(AStream, ObjectList);
      }

      // 既に検索されているIDを抹消 (高速化)
      ObjectList = SameValueCut(ObjectList);

      // 再帰的にオブジェクトを検索していく
      if (ObjectList.length != 0) {
        var len = ObjectList.length;
        for (var i = 0; i < len; i++) {
          StringList[StringList.length] = ObjectList[i];
          SeachPDFObject(parseInt(ObjectList[i], 10));
        }
      }
    } finally {
      // none
    }
  },

  // PDF Pageの書き込み
  WritePDFPage: function (PDFAnalyst, PageID, Dest, ObjectIDList, BassID) {
    // 新規IDの発行
    function GetNewID(S) {
      var val = parseInt(S, 10);
      var Result = -1;
      var len = ObjectIDList.length;

      for (var i = 0; i < len; i++) {
        if (val == ObjectIDList[i]) {
          Result = i + BassID;
          break;
        }
      }
      return Result;
    }

    // ストリームの中で定義されているIDを変換
    function ChangeObjectID(AStream) {
      var PrePos;

      // ストリームのコピー
      function CopyStream() {
        var NextPos;

        NextPos = AStream.Pos;
        if (NextPos == PrePos) return;
        AStream.Pos = PrePos;
        Dest.WriteStream(AStream, PrePos, NextPos);

        AStream.Pos = NextPos;
      }

      var P, C, B1, B2;
      var PrePos2, PrePos3;
      var StreamSize = 0;

      // ストリームの後ろに終端子を追加
      AStream.WriteString("\nendobj\n");
      AStream.Pos = 0;

      while (true) {
        PrePos = AStream.Pos;

        P = PDF_GetString(AStream);
        if (P == "") continue;

        // コメントをスキップ&削除  ---------------------------------------
        if (P == "%") {
          PDF_CommnetSkip(AStream);
          continue;
          // テキストをスキップ  --------------------------------------------
        } else if (P == "(") {
          PDF_TextSkip(AStream);
          // オブジェクト番号の変換 -----------------------------------------
        } else if (P[0].match(/[1-9]+/)) {
          try {
            // 位置を記憶
            PrePos2 = AStream.Pos;

            // 世代番号の取得
            B1 = PDF_GetString(AStream);
            if (B1 == "endobj") break;

            // R の取得
            B2 = PDF_GetString(AStream);
            if (B2 == "endobj") break;

            // オブジェクトが正しければ
            if (PDF_StrToIntDef(B1, -1) != -1 && B2 == "R") {
              // 無効なオブジェクトIDを抹消
              if (!PDFAnalyst.IsObjectID(P)) {
                AStream.Pos = PrePos2;
                continue;
              }

              // 位置を保存
              PrePos3 = AStream.Pos;

              // まず、(x 0 R)のxの前までコピー
              AStream.Pos = PrePos2 - P.length;
              CopyStream();

              // 新規IDの発行
              Dest.WriteString(GetNewID(P) + " 0 R");

              AStream.Pos = PrePos3;
              continue;
            } else {
              AStream.Pos = PrePos2;
            }
          } catch (e) {
            break;
          }
          // ストリームのサイズを取得 ---------------------------------------
        } else if (P == "/Length") {
          StreamSize = PDFAnalyst.GetObjectType_Integer(AStream);
          // ストリームをスキップ -------------------------------------------
        } else if (P == "stream") {
          C = AStream.ReadString(1);
          if (C == "\r") {
            AStream.ReadString(1);
          }
          AStream.Pos = AStream.Pos + StreamSize;
          // オブジェクトの終端子  ------------------------------------------
        } else if (P == "endobj") {
          break;
        }
        CopyStream();
      }
    }

    // 以前の情報を取得
    var Rotate = this.PDFPage_GetRotate(PDFAnalyst, PageID);
    var MediaBox = PDFAnalyst.GetMediaBox(PageID);
    var ConStream = this.PDFPage_GetContentsStream(PDFAnalyst, PageID);
    var ResStream = this.PDFPage_GetResourceStream(PDFAnalyst, PageID);

    this._ObjectMem.ObjectPosArray[this._ObjectMem.ObjectIndex] = Dest.getFileSize();
    try {
      // 先頭のIDを書き込む
      Dest.WriteString(this._ObjectMem.ObjectIndex + 1 + " 0 obj\n");
      // Kidsリストにベース番号を格納
      this._PageList[this._PageList.length] = this._ObjectMem.ObjectIndex + 1 + "";

      Dest.WriteString("<<\n");
      Dest.WriteString("/Type /Page\n");
      Dest.WriteString("/Parent 2 0 R\n");

      // メディアボックス
      if (MediaBox != "") {
        Dest.WriteString("/MediaBox " + MediaBox + "\n");
      }

      // リソース
      if (ResStream != null) {
        Dest.WriteString("/Resources ");
        ChangeObjectID(ResStream);
        Dest.WriteString("\n");
      }

      // コンテンツ
      if (ConStream != null) {
        Dest.WriteString("/Contents ");
        ChangeObjectID(ConStream);
        Dest.WriteString("\n");
      }

      // 回転角度
      Dest.WriteString("/Rotate " + Rotate + "\n");

      Dest.WriteString(">>\n");
      Dest.WriteString("endobj\n");

      this._ObjectMem.ObjectIndex++;
    } finally {
      // none
    }
  },

  //  PDF Objectの書き込み
  WritePDFObject: function (PDFAnalyst, ObjectID, Dest, ObjectIDList, BassID) {
    var PrePos, PrePos2;

    // ストリームのコピー
    function CopyStream() {
      var NextPos;

      // 現在のポジションを取得
      NextPos = PDFAnalyst.Stream.Pos;
      if (NextPos == PrePos) return;

      // 以前のポジションを設定
      PDFAnalyst.Stream.Pos = PrePos;
      // 現在のポジションまでコピーする
      Dest.WriteStream(PDFAnalyst.Stream, PrePos, NextPos);

      PDFAnalyst.Stream.Pos = NextPos;
    }

    // 新規IDの発行
    function GetNewID(S) {
      var val = parseInt(S, 10);
      var Result = -1;
      var len = ObjectIDList.length;

      for (var i = 0; i < len; i++) {
        if (val == ObjectIDList[i]) {
          Result = i + BassID;
          break;
        }
      }
      return Result;
    }

    // オブジェクトIDの変換
    function ChangeObjectID(S) {
      var PrePos3;

      // 位置を保存
      PrePos3 = PDFAnalyst.Stream.Pos;

      // まず、(x 0 R) のxの前までコピー
      PDFAnalyst.Stream.Pos = PrePos2 - S.length;
      CopyStream();

      // 新規IDの取得 & 書き込み
      Dest.WriteString(GetNewID(S) + " 0 R");

      PDFAnalyst.Stream.Pos = PrePos3;
    }

    var P, C, B1, B2;
    var BassPrePos = PDFAnalyst.Stream.Pos;
    var StreamSize = 0;

    PrePos = PDFAnalyst.Stream.Pos;
    PDFAnalyst.Stream.Pos = parseInt(PDFAnalyst.ObjectPosArray[ObjectID], 10);

    this._ObjectMem.ObjectPosArray[this._ObjectMem.ObjectIndex] = Dest.getFileSize();

    // コメントスキップ
    PDF_TopLineSkip(PDFAnalyst.Stream);

    // 先頭のIDを書き込む
    Dest.WriteString(this._ObjectMem.ObjectIndex + 1 + " 0 obj\n");

    try {
      while (true) {
        PrePos = PDFAnalyst.Stream.Pos;

        P = PDF_GetString(PDFAnalyst.Stream);
        if (P == "") continue;

        // テキストをスキップ  --------------------------------------------
        if (P == "(") {
          PDF_TextSkip(PDFAnalyst.Stream);
          // コメントをスキップ&削除  ---------------------------------------
        } else if (P == "%") {
          PDF_CommnetSkip(PDFAnalyst.Stream);
          continue;
          // オブジェクト番号の変換 -----------------------------------------
        } else if (P[0].match(/[1-9]+/)) {
          try {
            // 位置を記憶
            PrePos2 = PDFAnalyst.Stream.Pos;

            // 世代番号の取得
            B1 = PDF_GetString(PDFAnalyst.Stream);
            if (B1 == "endobj") {
              // 終端の場合はコピーして終わり
              CopyStream();
              break;
            }

            // R の取得
            B2 = PDF_GetString(PDFAnalyst.Stream);
            if (B2 == "endobj") {
              // 終端の場合はコピーして終わり
              CopyStream();
              break;
            }

            // オブジェクトが正しければ
            if (PDF_StrToIntDef(B1, -1) != -1 && B2 == "R") {
              // 無効なオブジェクトIDを抹消
              if (!PDFAnalyst.IsObjectID(P)) {
                PDFAnalyst.Stream.Pos = PrePos2;
                continue;
              }

              ChangeObjectID(P);
              continue;
            } else {
              PDFAnalyst.Stream.Pos = PrePos2;
            }
          } catch (e) {
            break;
          }
          // ストリームのサイズを取得 ---------------------------------------
        } else if (P == "/Length") {
          StreamSize = PDFAnalyst.GetObjectType_Integer(PDFAnalyst.Stream);
          // ストリームをスキップ -------------------------------------------
        } else if (P == "stream") {
          C = PDFAnalyst.Stream.ReadString(1);
          if (C == "\r") {
            PDFAnalyst.Stream.ReadString(1);
          }
          PDFAnalyst.Stream.Pos = PDFAnalyst.Stream.Pos + StreamSize;
          // オブジェクトの終端子  ------------------------------------------
        } else if (P == "endobj") {
          CopyStream();
          break;
        }
        CopyStream();
      }

      Dest.WriteString("\n");
      this._ObjectMem.ObjectIndex++;
    } finally {
      PDFAnalyst.Stream.Pos = BassPrePos;
    }
  },
};

////////////////////////////////////////////////////////////////////////////////
// TPDFCode
////////////////////////////////////////////////////////////////////////////////

// ---------------------
//  TPDFCode
// ---------------------
function TPDFCode() {
  // Method Only
}

// ---------------------
//  TPDFCode.Method
// ---------------------
TPDFCode.prototype = {
  // エンディアン変換
  SwapEndian: function (PWordArray) {
    var Hi;

    for (var i = 0; i < PWordArray.length; i++) {
      Hi = (PWordArray[i] & 0x00ff) << 8;
      PWordArray[i] = Hi + ((PWordArray[i] & 0xff00) >> 8);
    }
  },

  // 16進表記へ変換
  IntToHex: function (B) {
    var C = B.toString(16).toUpperCase();

    if (C.length == 1) {
      return "0" + C;
    } else {
      return C;
    }
  },

  // 文字が16進表記か判別する
  IsHex: function (C) {
    var Value = C.charCodeAt(0);

    if ((Value >= 0x41 && Value <= 0x46) || (Value >= 0x61 && Value <= 0x66) || (Value >= 0x30 && Value <= 0x39)) {
      return true;
    } else {
      return false;
    }
  },

  // 整数をByteの範囲まで丸める
  RoundoByte: function (Value) {
    if (Value > 255) {
      return 255;
    } else {
      return Value;
    }
  },

  // 10進文字よりByteへ変換
  DecimalCharToByte: function (C) {
    if (C.match(/[0-9]+/)) {
      return C.charCodeAt(0) - 0x30;
    } else {
      return 0;
    }
  },

  // Byteから8進数文字列へ変換
  ByteToOctalStr: function (Value) {
    var a = Value & 0x07; // 下位1-3bit
    var b = (Value & 0x38) >> 3; // 下位4-6bit
    var c = (Value & 0xc0) >> 6; // 下位7-8bit

    return "" + c + b + a;
  },

  // 8進数文字列からByteへ変換
  OctalStrToByte: function (S) {
    var a1, a2, c3;
    var b1, b2, b2;
    var Size = this.RoundoByte(S.length);

    if (Size == 0) {
      return 0;
    } else if (Size == 1) {
      a1 = "0";
      a2 = "0";
      a3 = S[0];
    } else if (Size == 2) {
      a1 = "0";
      a2 = S[0];
      a3 = S[1];
    } else {
      a1 = S[0];
      a2 = S[1];
      a3 = S[2];
    }

    b1 = this.DecimalCharToByte(a1);
    b2 = this.DecimalCharToByte(a2);
    b3 = this.DecimalCharToByte(a3);

    return (b1 << 6) + (b2 << 3) + b3;
  },

  // 8進数文字列からAscii Hexへ変換
  OctalStrToByteHexStr: function (S) {
    return this.IntToHex(this.OctalStrToByte(S));
  },

  // ReMoveEscape
  ReMoveEscape: function (PByeArray) {
    var P = Array();
    var C = 0;

    // エスケープ処理
    for (var i = 0; i < PByeArray.length; i++) {
      if (
        (C == 0x5c && PByeArray[i] == 0x5c) || // \\
        (C == 0x5c && PByeArray[i] == 0x28) || // \(
        (C == 0x5c && PByeArray[i] == 0x29) || // \)
        (C == 0x5c && PByeArray[i] == 0x0a) || // \n
        (C == 0x5c && PByeArray[i] == 0x0d) || // \r
        (C == 0x5c && PByeArray[i] == 0x09) || // \t
        (C == 0x5c && PByeArray[i] == 0x08) || // \b
        (C == 0x5c && PByeArray[i] == 0x0c)
      ) {
        // \f
        P[P.length - 1] = PByeArray[i];
      } else {
        P[P.length] = PByeArray[i];
      }
      C = PByeArray[i];
    }

    return P;
  },

  // PByteArrayToUnicode
  PByteArrayToUnicode: function (PByteArray) {
    var B;
    var i = 0;
    var len = PByteArray.length;
    var PWordArray = new Array();

    if (len % 2 != 0) {
      // It's broken.
      //throw PDFDESIGNER_ERROR_045;

      // できるだけ読み込むようにする
      len--;
    }

    while (true) {
      B = PByteArray[i];
      i++;
      PWordArray[PWordArray.length] = (B << 8) | PByteArray[i];
      if (i == len) break;

      i++;
      if (i == len) break;
    }

    return String.fromCharCode.apply(null, PWordArray);
  },

  // AsciiHexEncoding
  AsciiHexEncoding: function (S) {
    var P = "";
    var W;

    for (var i = 0; i < S.length; i++) {
      W = S.charCodeAt(i);
      if (W >= 256) {
        P += this.IntToHex(W);
      } else {
        P += "00" + this.IntToHex(W);
      }
    }

    return P;
  },

  // AsciiHexDeccoding
  AsciiHexDeccoding: function (P) {
    var C;
    var i = 0;
    var Result = new Array();

    if (P == "") return Result;

    while (true) {
      // 16進表記ならば
      if (this.IsHex(P[i])) {
        C = P[i];
        i++;
        if (i == P.length) break;
        if (this.IsHex(P[i])) {
          Result[Result.length] = parseInt(C + P[i], 16);
        }
      }
      i++;
      if (i == P.length) break;
    }
    return Result;
  },

  // PDFDocEncoding
  PDFDocEncoding: function (S) {
    var HiByte, LoByte;
    var PWordArray = new Array();
    var Result = "";

    for (var i = 0; i < S.length; i++) {
      PWordArray[PWordArray.length] = S.charCodeAt(i);
    }

    // エンディアン変換
    this.SwapEndian(PWordArray);

    for (var i = 0; i < PWordArray.length; i++) {
      HiByte = (PWordArray[i] & 0xff00) >> 8;
      LoByte = PWordArray[i] & 0x00ff;

      // 印字可能な範囲ならば
      if (LoByte >= 0x20 && LoByte <= 0x7f) {
        // 「\,(,)」ならば「\」を追加
        if (LoByte == 0x5c) {
          Result = Result + "\\\\";
        } else if (LoByte == 0x28) {
          Result = Result + "\\(";
        } else if (LoByte == 0x29) {
          Result = Result + "\\)";
        } else {
          // ASCII表記
          Result = Result + String.fromCharCode(LoByte);
        }
      } else {
        // 8進表記
        Result = Result + "\\" + this.ByteToOctalStr(LoByte);
      }

      // 印字可能な範囲ならば
      if (HiByte >= 0x20 && HiByte <= 0x7f) {
        // 「\,(,)」ならば「\」を追加
        if (HiByte == 0x5c) {
          Result = Result + "\\\\";
        } else if (HiByte == 0x28) {
          Result = Result + "\\(";
        } else if (HiByte == 0x29) {
          Result = Result + "\\)";
        } else {
          // ASCII表記
          Result = Result + String.fromCharCode(HiByte);
        }
      } else {
        // 8進表記
        Result = Result + "\\" + this.ByteToOctalStr(HiByte);
      }
    }

    if (Result != "") {
      Result = "\\376\\377" + Result;
    }

    return Result;
  },

  // PDFDocDecoding
  PDFDocDecoding: function (S, Ascii) {
    var P,
      C = "";
    var i = 0;
    var a1, a2, a3;
    var BOM = "\\376\\377";
    var BOM_LENGTH = 8;

    if (S == "") return "";

    P = S;
    // 先頭にBOMがあればBOMをスキップする
    if (P.length >= BOM_LENGTH) {
      if (P.slice(0, 8) == BOM) {
        i = 8;
      }
    }

    while (true) {
      if (P[i] == "\\") {
        // 8進表記かエスケープかを判別するため次の文字を取得
        i++;
        if (i == P.length) break;

        // この[\]はエスケープ文字である -----------------------
        if (P[i] == "\\") {
          C = C + (0x5c).toString(16).toUpperCase();
        } else if (P[i] == "(") {
          C = C + (0x28).toString(16).toUpperCase();
        } else if (P[i] == ")") {
          C = C + (0x29).toString(16).toUpperCase();
        } else if (P[i] == "n") {
          C = C + (0x0a).toString(16).toUpperCase();
        } else if (P[i] == "r") {
          C = C + (0x0d).toString(16).toUpperCase();
        } else if (P[i] == "t") {
          C = C + (0x09).toString(16).toUpperCase();
        } else if (P[i] == "b") {
          C = C + (0x08).toString(16).toUpperCase();
        } else if (P[i] == "f") {
          C = C + (0x0c).toString(16).toUpperCase();

          // この[\]は改行コードである ---------------------------
        } else if (P[i] == "\n" || P[i] == "\r") {
          // 改行コードが「CR+LF」かチェック
          if (P[i] == "\r") {
            i++;
            if (P[i] != "\n") {
              i--;
            }
          }
          // この[\]は8進表記である ------------------------------
        } else if (P[i].match(/[0-9]+/)) {
          // 8進表記(\ddd)の \dxx のとき
          a1 = P[i];
          i++;
          if (i == P.length) {
            C = C + this.OctalStrToByteHexStr(a1);
            break;
          }
          if (!P[i].match(/[0-9]+/)) {
            C = C + this.OctalStrToByteHexStr(a1);
            continue;
          }

          // 8進表記(\ddd)の \ddx のとき
          a2 = P[i];
          i++;
          if (i == P.length) {
            C = C + this.OctalStrToByteHexStr(a1 + a2);
            break;
          }
          if (!P[i].match(/[0-9]+/)) {
            C = C + this.OctalStrToByteHexStr(a1 + a2);
            continue;
          }

          // 8進表記(\ddd)の \ddd のとき
          a3 = P[i];
          C = C + this.OctalStrToByteHexStr(a1 + a2 + a3);
        }
      } else {
        // Ascii文字->Ascii HexDump
        C = C + this.IntToHex(P[i].charCodeAt(0));
      }
      i++;
      if (i == P.length) break;
    }

    if (Ascii) {
      return String.fromCharCode.apply(null, this.AsciiHexDeccoding(C));
    } else {
      return this.PByteArrayToUnicode(this.AsciiHexDeccoding(C));
    }
  },

  // GetPDFText
  GetPDFTextStream: function (AStream) {
    var P, C;
    var B1, B2, B3, B4;
    var PByeArray = new Array();
    var Lessthan = false;

    // 移植する際にココと関連メソッドを変更しています。
    // ・Unicode/Ascii以外の各国固有の文字コードは各自で処理して下さい。
    // ・stream内のテキストもこのメソッドで取得可能です。
    // ・「未知の形式」はプロパティ等のレアケースで 953 0 R 等と記述されている例があります。

    // (...) または <...> の中身だけを取得する
    while (true) {
      P = AStream.Read(1)[0];
      // 未知の形式
      if (P == undefined || P == null) {
        return undefined;
      }

      // (
      if (P == 0x28) {
        Lessthan = false;
        break;
      }

      // <
      if (P == 0x3c) {
        Lessthan = true;
        break;
      }
    }

    while (true) {
      P = AStream.Read(1)[0];

      // 未知の形式(ファイルの破損)
      if (P == undefined || P == null) {
        return undefined;
      }

      // \(エスケープ)
      if (P == 0x5c) {
        C = AStream.Read(1)[0];
        // 未知の形式(ファイルの破損)
        if (C == undefined || C == null) {
          return undefined;
        }
        PByeArray[PByeArray.length] = P;
        PByeArray[PByeArray.length] = C;
        // 終端 ) >
      } else if (P == 0x29 || P == 0x3e) {
        if ((P == 0x29 && !Lessthan) || (P == 0x3e && Lessthan)) {
          break;
        } else {
          PByeArray[PByeArray.length] = P;
        }
      } else {
        PByeArray[PByeArray.length] = P;
      }
    }

    if (PByeArray.length < 2) {
      // Ascii(短)
      return this.PDFDocDecoding(String.fromCharCode.apply(null, PByeArray), true);
    } else {
      B1 = PByeArray[0];
      B2 = PByeArray[1];

      if (B1 == 0xfe && B2 == 0xff) {
        // Unicode
        return this.PByteArrayToUnicode(this.ReMoveEscape(PByeArray).slice(2));
      } else {
        B1 = String.fromCharCode(PByeArray[0]);
        B2 = String.fromCharCode(PByeArray[1]);
        // PDFDocEncoding - Unicocde
        if (B1 == "\\" && B2 == "3") {
          return this.PDFDocDecoding(String.fromCharCode.apply(null, PByeArray), false);
          // PDFDocEncoding - Sjisなど全ての文字コード( Old for PDF )
        } else if (B1 == "\\") {
          // Character code of your country, please change code
          return this.PDFDocDecoding(String.fromCharCode.apply(null, PByeArray), true);
        } else {
          if (PByeArray.length < 4) {
            // Ascii(短)
            return this.PDFDocDecoding(String.fromCharCode.apply(null, PByeArray), true);
          } else {
            B1 = String.fromCharCode(PByeArray[0]).toUpperCase();
            B2 = String.fromCharCode(PByeArray[1]).toUpperCase();
            B3 = String.fromCharCode(PByeArray[2]).toUpperCase();
            B4 = String.fromCharCode(PByeArray[3]).toUpperCase();

            if (B1 == "F" && B2 == "E" && B3 == "F" && B4 == "F") {
              // Unicode(Hex)
              return this.PByteArrayToUnicode(
                this.ReMoveEscape(this.AsciiHexDeccoding(String.fromCharCode.apply(null, PByeArray))).slice(2)
              );
            } else {
              // Ascii(長)
              return this.PDFDocDecoding(String.fromCharCode.apply(null, PByeArray), true);
            }
          }
        }
      }
    }
  },
};

////////////////////////////////////////////////////////////////////////////////
// TPDFDocInfo
////////////////////////////////////////////////////////////////////////////////

// ---------------------
//  TPDFDocInfo
// ---------------------
function TPDFDocInfo() {
  // Public Property
  this.Title = ""; // タイトル
  this.Subject = ""; // サブタイトル
  this.Author = ""; // 作成者
  this.Keywords = ""; // キーワード
  this.Creator = ""; // アプリケーション(作成)
  this.Producer = ""; // PDF変換
  this.CreationDate = ""; // 作成日
  this.ModDate = ""; // 更新日
  this.Trapped = false; // トラップ
}

// ---------------------
//  TPDFDocInfo.Method
// ---------------------
TPDFDocInfo.prototype = {
  // PDF用のファイルスタンプから日付(yyyymmdd形式)を作成(UTCの除去)
  DateTimeToStr: function (S) {
    var vYear, vMonth, vDay, vHour, vMinute, vSecond;
    var Value;

    // ----------------------------------------------------------------------------
    // (D: 1999 03 11 21 28 08  [[-,+,Z] 09'00'] )
    //      年  月 日 時 分 秒  UTC(グリニッジを標準とし誤差がどれぐらいあるか)
    // ----------------------------------------------------------------------------
    if (S.length >= 14) {
      vYear = S.slice(0, 4);
      vMonth = S.slice(4, 6);
      vDay = S.slice(6, 8);
      vHour = S.slice(8, 10);
      vMinute = S.slice(10, 12);
      vSecond = S.slice(12, 14);

      // 西暦
      Value = PDF_StrToIntDef(vYear, -1);
      if (!(Value >= 0 && Value <= 9999)) vYear = "2000";

      // 月
      Value = PDF_StrToIntDef(vMonth, -1);
      if (!(vMonth >= 1 && vMonth <= 12)) vMonth = "01";

      // 日
      Value = PDF_StrToIntDef(vDay, -1);
      if (!(vDay >= 1 && vDay <= 31)) vDay = "01";

      // 時
      Value = PDF_StrToIntDef(vHour, -1);
      if (!(vHour >= 0 && vHour <= 23)) vHour = "00";

      // 分
      Value = PDF_StrToIntDef(vMinute, -1);
      if (!(vMinute >= 0 && vMinute <= 59)) vMinute = "00";

      // 秒
      Value = PDF_StrToIntDef(vSecond, -1);
      if (!(vSecond >= 0 && vSecond <= 59)) vSecond = "00";

      return vYear + vMonth + vDay + vHour + vMinute + vSecond;
    } else {
      return "";
    }
  },

  // 作成日/更新日の取得
  GetPDFDateStream: function (AStream) {
    var P;
    var Result = "";

    while (true) {
      P = AStream.ReadString(1);
      if (P == ")") break;
      if (P.match(/[0-9]+/) || P == "+" || P == "-" || P == "z" || P == "Z)" || P == "'") {
        Result = Result + P;
      }
    }
    return Result;
  },

  // 文書情報の取得
  GetPDFDocInfo: function (PDFAnalyst) {
    var P, C;
    var AStream;
    var PDFCode = new TPDFCode();

    // 暗号の確認
    if (PDFAnalyst.Encrypt) {
      PDFAnalyst.LoadError(PDFDESIGNER_ERROR_025);
    }

    if (PDFAnalyst.IsObjectID(PDFAnalyst.InfoID)) {
      // 削除済みオブジェクトならば終了
      if (PDFAnalyst.DeleteObject[PDFAnalyst.InfoID]) {
        return;
      }

      AStream = PDFAnalyst.GetObjectStream(PDFAnalyst.InfoID);

      PDF_TopLineSkip(AStream);

      while (true) {
        P = PDF_GetString(AStream);
        if (P == "") continue;

        if (P == "/Title") {
          C = PDFCode.GetPDFTextStream(AStream);
          if (C == undefined) break;
          else this.Title = C;
        } else if (P == "/Subject") {
          C = PDFCode.GetPDFTextStream(AStream);
          if (C == undefined) break;
          else this.Subject = C;
        } else if (P == "/Author") {
          C = PDFCode.GetPDFTextStream(AStream);
          if (C == undefined) break;
          else this.Author = C;
        } else if (P == "/Keywords") {
          C = PDFCode.GetPDFTextStream(AStream);
          if (C == undefined) break;
          else this.Keywords = C;
        } else if (P == "/Creator") {
          C = PDFCode.GetPDFTextStream(AStream);
          if (C == undefined) break;
          else this.Creator = C;
        } else if (P == "/Producer") {
          C = PDFCode.GetPDFTextStream(AStream);
          if (C == undefined) break;
          else this.Producer = C;
        } else if (P == "/ModDate") {
          C = PDFCode.GetPDFTextStream(AStream);
          if (C == undefined) break;
          else this.ModDate = C;
        } else if (P == "/CreationDate") {
          C = PDFCode.GetPDFTextStream(AStream);
          if (C == undefined) break;
          else this.CreationDate = C;
        } else if (P == "/Trapped") {
          P = PDF_GetString(AStream);
          if (P == "/True") {
            this.Trapped = true;
          }
          if (P == "/False") {
            this.Trapped = false;
          }
          if (P == "/Unknown") {
            this.Trapped = false;
          }
        } else if (P == "(") {
          // 未知の形式でテキスト型がある時はスキップする
          PDF_TextSkip(AStream);
        } else if (P == "%") {
          // コメントのスキップ
          PDF_CommnetSkip(AStream);
        } else if (P == "endobj") {
          break;
        }
      }
    }
  },
};

////////////////////////////////////////////////////////////////////////////////
//  Enum
////////////////////////////////////////////////////////////////////////////////

// ---------------------
//  TPDFPageLayout
// ---------------------
var TPDFPageLayout = {
  plDefault: 0, // デフォルト
  plSinglePage: 1, // 単一のページ
  plOneColumn: 2, // 連続
  plTwoColumnLeft: 3, // 見開き(左)
  plTwoColumnRight: 4, // 見開き(右)
};

// ---------------------
//  TPDFPageMode
// ---------------------
export let TPDFPageMode = {
  pmDefault: 0, // デフォルト
  pmUseNone: 1, // なし
  pmUseOutlines: 2, // しおりとページ
  pmUseThumbs: 3, // サムネイルとページ
  pmFullScreen: 4, // フルスクリーン
};

// ---------------------
//  TPDFOpenActionType
// ---------------------
var TPDFOpenActionType = {
  oaDefault: 0, // デフォルト                 --- Syntax ------------------------------------
  oaXYZ: 1, // 倍率指定                   [page /XYZ left top zoom] (8.333%-1600%まで)
  oaFit: 2, // 全体表示                   [page /Fit]
  oaFitH: 3, // 幅に合わせる               [page /FitH top]
  oaFitV: 4, //                            [page /FitV left]
  oaFitR: 5, //                            [page /FitR left bottom right top]
  oaFitB: 6, //                            [page /FitB]
  oaFitBH: 7, // 描画領域の幅に合わせる     [page /FitBH top]
  oaFitBV: 8, //                            [page /FitBV left]
};

////////////////////////////////////////////////////////////////////////////////
// TPDFOpenAction
////////////////////////////////////////////////////////////////////////////////

// ---------------------
//  TPDFOpenAction
// ---------------------
function TPDFOpenAction() {
  this.Left = -1;
  this.Top = -1;
  this.Right = -1;
  this.Bottom = -1;
  this.Zoom = -1;
  this.ObjectID = -1;
  this.GenerationID = -1;
  this.SubType = TPDFOpenActionType.oaDefault;
}

TPDFOpenAction.prototype = {
  Assign: function (Source) {
    this.Left = Source.Left;
    this.Top = Source.Top;
    this.Right = Source.Right;
    this.Bottom = Source.Bottom;
    this.Zoom = Source.Zoom;
    this.ObjectID = Source.ObjectID;
    this.GenerationID = Source.GenerationID;
    this.SubType = Source.SubType;
  },
};

////////////////////////////////////////////////////////////////////////////////
// TPDFViewerPreferences
////////////////////////////////////////////////////////////////////////////////

// ---------------------
//  TPDFViewerPreferences
// ---------------------
function TPDFViewerPreferences() {
  this.HideToolbar = false;
  this.HideMenubar = false;
  this.HideWindowUI = false;
  this.FitWindow = false;
  this.CenterWindow = false;
  this.Direction = false;
  this.DisplayDocTitle = false;
  this.NonFullScreenPageMode = TPDFPageMode.pmDefault;
}

TPDFViewerPreferences.prototype = {
  Assign: function (Source) {
    this.HideToolbar = Source.HideToolbar;
    this.HideMenubar = Source.HideMenubar;
    this.HideWindowUI = Source.HideWindowUI;
    this.FitWindow = Source.FitWindow;
    this.CenterWindow = Source.CenterWindow;
    this.Direction = Source.Direction;
    this.DisplayDocTitle = Source.DisplayDocTitle;
    this.NonFullScreenPageMode = Source.NonFullScreenPageMode;
  },
};

////////////////////////////////////////////////////////////////////////////////
// TPDFDocView
////////////////////////////////////////////////////////////////////////////////

// ---------------------
//  TPDFDocView
// ---------------------
function TPDFDocView() {
  // Public Property
  this.PageMode = TPDFPageMode.pmDefault;
  this.PageLayout = TPDFPageLayout.plDefault;
  this.OpenAction = new TPDFOpenAction();
  this.ViewerPreferences = new TPDFViewerPreferences();
}

TPDFDocView.prototype = {
  Assign: function (Source) {
    this.PageMode = Source.PageMode;
    this.PageLayout = Source.PageLayout;
    this.OpenAction = Source.OpenAction;
    this.ViewerPreferences = Source.ViewerPreferences;
  },

  GetDeirect_ViewerPreferences: function (AStream) {
    var P;

    function IsBoolean(S) {
      if (S.toLowerCase() == "true") {
        return true;
      } else {
        return false;
      }
    }

    while (true) {
      P = PDF_GetString(AStream);
      if (P == "") {
        continue;
      }

      if (P[0] == "/") {
        if (P == "/HideToolbar") this.ViewerPreferences.HideToolbar = IsBoolean(PDF_GetString(AStream));
        else if (P == "/HideMenubar") this.ViewerPreferences.HideMenubar = IsBoolean(PDF_GetString(AStream));
        else if (P == "/HideWindowUI") this.ViewerPreferences.HideWindowUI = IsBoolean(PDF_GetString(AStream));
        else if (P == "/FitWindow") this.ViewerPreferences.FitWindow = IsBoolean(PDF_GetString(AStream));
        else if (P == "/CenterWindow") this.ViewerPreferences.CenterWindow = IsBoolean(PDF_GetString(AStream));
        else if (P == "/DisplayDocTitle") this.ViewerPreferences.DisplayDocTitle = IsBoolean(PDF_GetString(AStream));
        else if (P == "/NonFullScreenPageMode") {
          P = PDF_GetString(AStream);
          if (P == "/UseNone") this.ViewerPreferences.NonFullScreenPageMode = TPDFPageMode.pmUseNone;
          else if (P == "/UseOutlines") this.ViewerPreferences.NonFullScreenPageMode = TPDFPageMode.pmUseOutlines;
          else if (P == "/UseThumbs") this.ViewerPreferences.NonFullScreenPageMode = TPDFPageMode.pmUseThumbs;
          else {
            this.ViewerPreferences.NonFullScreenPageMode = TPDFPageMode.pmDefault;
          }

          // PageDirectionはPDF作成ソフトのPDFデザイナーで間違って記述したのでそれの修正の為 :-)
        } else if (P == "/Direction" || P == "/PageDirection") {
          P = PDF_GetString(AStream);
          if (P == "/R2L") this.ViewerPreferences.Direction = true;
        }
      }
      // テキストのスキップ -------------------------------------------------
      else if (P == "(") {
        PDF_TextSkip(AStream);
        // コメントのスキップ -------------------------------------------------
      } else if (P == "%") {
        PDF_CommnetSkip(AStream);
        // 辞書の終端 ---------------------------------------------------------
      } else if (P == ">") {
        break;
      }
    }
  },

  GetInDeirect_ViewerPreferences: function (PDFAnalyst, ObjectID) {
    var P;
    var PrePos;

    PrePos = PDFAnalyst.Stream.Pos;
    PDFAnalyst.Stream.Pos = parseInt(PDFAnalyst.ObjectPosArray[ObjectID], 10);

    try {
      PDF_TopLineSkip(PDFAnalyst.Stream);
      while (true) {
        P = PDF_GetString(PDFAnalyst.Stream);
        // コメントのスキップ ----------------------------------------------
        if (P == "%") {
          PDF_CommnetSkip(PDFAnalyst.Stream);
          // 辞書の取得 ------------------------------------------------------
        } else if (P == "<") {
          // << までファイルポインタを移動
          PDFAnalyst.Stream.Pos = PDFAnalyst.Stream.Pos + 1;
          this.GetDeirect_ViewerPreferences(PDFAnalyst.Stream);
          break;
          // オブジェクトの終わり --------------------------------------------
        } else if (P == "endobj") {
          break;
        }
      }
    } finally {
      PDFAnalyst.Stream.Pos = PrePos;
    }
  },

  GetDeirect_OpenAction_Array: function (AStream) {
    var P;

    P = PDF_GetString(AStream);
    if (P == "(") {
      // ページ番号が「オブジェクト番号」では無く「名前」で定義されている ----
      PDF_TextSkip(AStream);
      // No,Support
    } else if (P[0].match(/[1-9]+/)) {
      // オブジェクト番号と世代番号の取得 ------------------------------------
      this.OpenAction.ObjectID = PDF_StrToIntDef(P, -1);
      this.OpenAction.GenerationID = PDF_StrToIntDef(PDF_GetString(AStream), -1);

      // R の確認
      if (PDF_GetString(AStream) != "R") {
        this.OpenAction.ObjectID = -1;
        this.OpenAction.GenerationID = -1;
      }

      P = PDF_GetString(AStream);

      // 全体表示 ------------------------------------------------------------
      if (P == "/Fit") {
        this.OpenAction.SubType = TPDFOpenActionType.oaFit;
        // 幅に合わせる --------------------------------------------------------
      } else if (P == "/FitH") {
        this.OpenAction.SubType = TPDFOpenActionType.oaFitH;
        this.OpenAction.Top = PDF_StrToFloatDef(PDF_GetString(AStream), -1);
        // ---------------------------------------------------------------------
      } else if (P == "/FitV") {
        this.OpenAction.SubType = TPDFOpenActionType.oaFitV;
        this.OpenAction.Left = PDF_StrToFloatDef(PDF_GetString(AStream), -1);
        // ---------------------------------------------------------------------
      } else if (P == "/FitR") {
        this.OpenAction.SubType = TPDFOpenActionType.oaFitR;
        this.OpenAction.Left = PDF_StrToFloatDef(PDF_GetString(AStream), -1);
        this.OpenAction.Bottom = PDF_StrToFloatDef(PDF_GetString(AStream), -1);
        this.OpenAction.Right = PDF_StrToFloatDef(PDF_GetString(AStream), -1);
        this.OpenAction.Top = PDF_StrToFloatDef(PDF_GetString(AStream), -1);
        // ---------------------------------------------------------------------
      } else if (P == "/FitB") {
        this.OpenAction.SubType = TPDFOpenActionType.oaFitB;
        // 描画領域の幅に合わせる ----------------------------------------------
      } else if (P == "/FitBH") {
        this.OpenAction.SubType = TPDFOpenActionType.oaFitBH;
        this.OpenAction.Top = PDF_StrToFloatDef(PDF_GetString(AStream), -1);
        // ---------------------------------------------------------------------
      } else if (P == "/FitBV") {
        this.OpenAction.SubType = TPDFOpenActionType.oaFitBV;
        this.OpenAction.Left = PDF_StrToFloatDef(PDF_GetString(AStream), -1);
        // 倍率の取得 ----------------------------------------------------------
      } else if (P == "/XYZ") {
        this.OpenAction.SubType = TPDFOpenActionType.oaXYZ;
        this.OpenAction.Left = PDF_StrToFloatDef(PDF_GetString(AStream), -1);
        this.OpenAction.Top = PDF_StrToFloatDef(PDF_GetString(AStream), -1);
        this.OpenAction.Zoom = PDF_StrToFloatDef(PDF_GetString(AStream), -1);
        // すべてが null(-32768)の場合もある
        // 破損 ----------------------------------------------------------------
      } else {
        this.OpenAction.SubType = TPDFOpenActionType.oaDefault;
      }
    }
  },

  GetDeirect_OpenAction_Dictionary: function (AStream) {
    var P;

    while (true) {
      P = PDF_GetString(AStream);
      // アクション配列の取得 -----------------------------------------------
      if (P == "/D") {
        P = PDF_GetString(AStream);
        if (P == "[") {
          this.GetDeirect_OpenAction_Array(AStream);
        }
        // テキストのスキップ -------------------------------------------------
      } else if (P == "(") {
        PDF_TextSkip(AStream);
        // コメントのスキップ -------------------------------------------------
      } else if (P == "%") {
        PDF_CommnetSkip(AStream);
        // 辞書の終端 ---------------------------------------------------------
      } else if (P == ">") {
        break;
      }
    }
  },

  GetInDeirect_OpenAction: function (PDFAnalyst, ObjectID) {
    var P;
    var PrePos;

    PrePos = PDFAnalyst.Stream.Pos;
    PDFAnalyst.Stream.Pos = parseInt(PDFAnalyst.ObjectPosArray[ObjectID], 10);

    try {
      PDF_TopLineSkip(PDFAnalyst.Stream);
      while (true) {
        P = PDF_GetString(PDFAnalyst.Stream);
        // コメントのスキップ ----------------------------------------------
        if (P == "%") {
          PDF_CommnetSkip(PDFAnalyst.Stream);
          // 辞書の取得 ------------------------------------------------------
        } else if (P == "<") {
          // << までファイルポインタを移動
          PDFAnalyst.Stream.Pos = PDFAnalyst.Stream.Pos + 1;
          this.GetDeirect_OpenAction_Dictionary(PDFAnalyst.Stream);
          break;
          // 配列の取得 ------------------------------------------------------
        } else if (P == "[") {
          this.GetDeirect_OpenAction_Array(PDFAnalyst.Stream);
          break;
          // オブジェクトの終了-----------------------------------------------
        } else if (P == "endobj") {
          break;
        }
      }
    } finally {
      PDFAnalyst.Stream.Pos = PrePos;
    }
  },

  GetPDFDocView: function (PDFAnalyst) {
    var P;
    var PrePos;

    if (PDFAnalyst.IsObjectID(PDFAnalyst.RootID) && !PDFAnalyst.Encrypt) {
      PrePos = PDFAnalyst.Stream.Pos;
      PDFAnalyst.Stream.Pos = parseInt(PDFAnalyst.ObjectPosArray[PDFAnalyst.RootID], 10);

      try {
        PDF_TopLineSkip(PDFAnalyst.Stream);

        while (true) {
          P = PDF_GetString(PDFAnalyst.Stream);
          // ページレイアウトの取得 ---------------------------------------
          if (P == "/PageLayout") {
            P = PDF_GetString(PDFAnalyst.Stream);
            if (P == "/SinglePage") this.PageLayout = TPDFPageLayout.plSinglePage;
            else if (P == "/OneColumn") this.PageLayout = TPDFPageLayout.plOneColumn;
            else if (P == "/TwoColumnLeft") this.PageLayout = TPDFPageLayout.plTwoColumnLeft;
            else if (P == "/TwoColumnRight") this.PageLayout = TPDFPageLayout.plTwoColumnRight;
            else this.PageLayout = TPDFPageLayout.plDefault;
            // ページモードの取得 -------------------------------------------
          } else if (P == "/PageMode") {
            P = PDF_GetString(PDFAnalyst.Stream);
            if (P == "/UseNone") this.PageMode = TPDFPageMode.pmUseNone;
            else if (P == "/UseOutlines") this.PageMode = TPDFPageMode.pmUseOutlines;
            else if (P == "/UseThumbs") this.PageMode = TPDFPageMode.pmUseThumbs;
            else if (P == "/FullScreen") this.PageMode = TPDFPageMode.pmFullScreen;
            else this.PageMode = TPDFPageMode.pmDefault;
            // ViewerPreferencesの取得 --------------------------------------
          } else if (P == "/ViewerPreferences") {
            P = PDF_GetString(PDFAnalyst.Stream);
            // ダイレクト
            if (P == "<") {
              // << までファイルポインタを移動
              PDFAnalyst.Stream.Pos = PDFAnalyst.Stream.Pos + 1;
              this.GetDeirect_ViewerPreferences(PDFAnalyst.Stream);
              // インダイレクト
            } else if (P[0].match(/[1-9]+/)) {
              if (PDFAnalyst.IsObjectID(P)) {
                this.GetInDeirect_ViewerPreferences(PDFAnalyst, parseInt(P, 10));
              }
            }
            // OpenActionの取得 ---------------------------------------------
          } else if (P == "/OpenAction") {
            P = PDF_GetString(PDFAnalyst.Stream);
            // ダイレクトで配列
            if (P == "[") {
              this.GetDeirect_OpenAction_Array(PDFAnalyst.Stream);
              // ダイレクトで辞書
            } else if (P == "<") {
              this.GetDeirect_OpenAction_Dictionary(PDFAnalyst.Stream);
              // インダイレクトで辞書または配列 (ほとんどの場合、辞書)
            } else if (P[0].match(/[1-9]+/)) {
              if (PDFAnalyst.IsObjectID(P)) this.GetInDeirect_OpenAction(PDFAnalyst, parseInt(P, 10));
            }
            // テキストのスキップ -------------------------------------------
          } else if (P == "(") {
            PDF_TextSkip(PDFAnalyst.Stream);
            // コメントのスキップ -------------------------------------------
          } else if (P == "%") {
            PDF_CommnetSkip(PDFAnalyst.Stream);
            // オブジェクトの終端 -------------------------------------------
          } else if (P == "endobj") {
            break;
          }
        }
      } finally {
        PDFAnalyst.Stream.Pos = PrePos;
      }
    }
  },
};

////////////////////////////////////////////////////////////////////////////////
// TPDFCombine
////////////////////////////////////////////////////////////////////////////////

// ---------------------
//  TPDFCombine
// ---------------------
function TPDFCombine() {
  // Praivate
  this._BassID = 0;
  this._PageList = new Array();
  this._ObjectMem = new TPDFObjMemManager();

  // Public Property
  this.Info = new TPDFDocInfo();
  this.View = new TPDFDocView();
}

// ---------------------
//  TPDFCombine.Method
// ---------------------
TPDFCombine.prototype = {
  // PDFファイルを結合する
  SaveToFile: function (FileName, PDFAnalysts, PDFCallBack) {
    var AStream = new TFileStream();
    var PageCount = 0;
    var PDFVersion = "1.4";

    this._BassID = 3;
    this._PageList = new Array();

    var Parser = new TPDFParser(this._ObjectMem, this._PageList);

    // 全てのページ数を足す + 最も最新のPDFバージョンを取得 -------------------
    for (var i = 0; i < PDFAnalysts.length; i++) {
      if (PDFAnalysts[i].Encrypt) {
        PDFAnalysts[i].LoadError(PDFDESIGNER_ERROR_025);
      }

      PageCount = PageCount + PDFAnalysts[i].PageCount;
      // 常に1.4形式にする
      //if (parseInt(PDFVersion[0] + PDFVersion[2],10) <
      //    parseInt(PDFAnalysts[i].Version[0] + PDFAnalysts[i].Version[2] ,10)){
      //    PDFVersion =  PDFAnalysts[i].Version;
      // }
    }
    // PDFのバージョンを書き込む
    AStream.WriteString(PDFVersion + "\n");

    // 最初のヘッダ部分は後で書き込む
    this._ObjectMem.ObjectIndex = this._ObjectMem.ObjectIndex + 2;

    // すべてのPDFファイルを結合する ---------------------------------------
    for (var i = 0; i < PDFAnalysts.length; i++) {
      if (PDFCallBack != undefined) {
        setTimeout(PDFCallBack, 500, Math.floor((i / PDFAnalysts.length) * 100), i + 1, PDFAnalysts.length);
      }

      // ベースIDの増加
      if (i != 0) {
        this._BassID = this._ObjectMem.ObjectIndex + 1;
      }

      // ページのIDを列挙 ---------------------------------------------
      var PageIDList = new Array();
      PDFAnalysts[i].GetPageInfo(PageIDList);

      // 使用しているオブジェクトを列挙
      for (var j = 0; j < PDFAnalysts[i].PageCount; j++) {
        Parser.GetPageInObjectList(PDFAnalysts[i], PageIDList[j], PageIDList);
      }

      // 重複ID抹消
      var ObjectIDList = PDF_OverlappingCut(PageIDList);

      // ページの書き込み ---------------------------------------------
      for (var j = 0; j < PDFAnalysts[i].PageCount; j++) {
        Parser.WritePDFPage(PDFAnalysts[i], PageIDList[j], AStream, ObjectIDList, this._BassID);
      }

      // ページで使用されているオブジェクトの書き込み -----------------
      var len = ObjectIDList.length;
      for (var j = PDFAnalysts[i].PageCount; j < len; j++) {
        Parser.WritePDFObject(PDFAnalysts[i], ObjectIDList[j], AStream, ObjectIDList, this._BassID);
      }
    }

    // ヘッダーの書き込み
    Parser.WritePDFHedaer(AStream, this._ObjectMem, this.View, this._PageList[0]);

    // フッターの書き込み
    Parser.WritePDFFooter(AStream, this.Info);

    if (PDFCallBack != undefined) {
      setTimeout(PDFCallBack, 500, 100, PDFAnalysts.length, PDFAnalysts.length);
    }

    // ファイルのダウンロード
    AStream.SaveToFile(FileName);
  },
};

////////////////////////////////////////////////////////////////////////////////
// TPDFKnife
////////////////////////////////////////////////////////////////////////////////

// ---------------------
//  TPDFKnife
// ---------------------
function TPDFKnife() {
  // Praivate
  this._BassID = 0;
  this._PageList = new Array();
  this._ObjectMem = new TPDFObjMemManager();

  // Public Property
  this.Info = new TPDFDocInfo();
  this.View = new TPDFDocView();
}

// ---------------------
//  TPDFKnife.Method
// ---------------------
TPDFKnife.prototype = {
  // ページの抽出/分割
  SaveToFile: function (FileName, PDFAnalyst, begin, end) {
    var AStream = new TFileStream();
    var ObjectList = new Array();
    var PDFVersion = "1.4";

    this._BassID = 3;
    this._PageList = new Array();

    var Parser = new TPDFParser(this._ObjectMem, this._PageList);

    // 暗号の確認
    if (PDFAnalyst.Encrypt) {
      PDFAnalyst.LoadError(PDFDESIGNER_ERROR_025);
    }

    // ページ範囲の確認
    if (begin < 1 || end > PDFAnalyst.PageCount || begin > end) {
      PDFAnalyst.LoadError(PDFDESIGNER_ERROR_030);
    }

    // PDFのバージョンを書き込む
    AStream.WriteString(PDFVersion + "\n");

    // 最初のヘッダ部分は後で書き込む
    this._ObjectMem.ObjectIndex = this._ObjectMem.ObjectIndex + 2;

    // 全ページのIDを列挙 ---------------------------------------------
    var PageIDList = new Array();
    PDFAnalyst.GetPageInfo(PageIDList);

    // 抽出・分解するページIDだけを取得 -------------------------------
    for (var i = begin - 1; i < end; i++) {
      if (i >= 0 && i <= PageIDList.length - 1) {
        ObjectList[ObjectList.length] = PageIDList[i];
      }
    }

    PageIDList = new Array();
    for (var i = 0; i < ObjectList.length; i++) {
      PageIDList[PageIDList.length] = parseInt(ObjectList[i], 10);
    }

    // 使用しているオブジェクトを列挙
    for (var i = 0; i < PageIDList.length; i++) {
      Parser.GetPageInObjectList(PDFAnalyst, PageIDList[i], ObjectList);
    }

    // 重複ID抹消
    var ObjectIDList = PDF_OverlappingCut(ObjectList);

    // ページの書き込み ---------------------------------------------
    for (var i = 0; i < PageIDList.length; i++) {
      Parser.WritePDFPage(PDFAnalyst, PageIDList[i], AStream, ObjectIDList, this._BassID);
    }

    // ページで使用されているオブジェクトの書き込み -----------------
    var len = ObjectIDList.length;
    for (var i = PageIDList.length; i < len; i++) {
      Parser.WritePDFObject(PDFAnalyst, ObjectIDList[i], AStream, ObjectIDList, this._BassID);
    }

    // ヘッダーの書き込み
    Parser.WritePDFHedaer(AStream, this._ObjectMem, this.View, this._PageList[0]);

    // フッターの書き込み
    Parser.WritePDFFooter(AStream, this.Info);

    // ファイルのダウンロード
    AStream.SaveToFile(FileName);
  },
};

////////////////////////////////////////////////////////////////////////////////
// TPDFDeletePage
////////////////////////////////////////////////////////////////////////////////

// ---------------------
//  TPDFDeletePage
// ---------------------
function TPDFDeletePage() {
  // Praivate
  this._BassID = 0;
  this._PageList = new Array();
  this._ObjectMem = new TPDFObjMemManager();

  // Public Property
  this.Info = new TPDFDocInfo();
  this.View = new TPDFDocView();
}

// ---------------------
//  TPDFDeletePage.Method
// ---------------------
TPDFDeletePage.prototype = {
  // ページの削除
  SaveToFile: function (FileName, PDFAnalyst, begin, end) {
    var AStream = new TFileStream();
    var ObjectList = new Array();
    var PDFVersion = "1.4";

    this._BassID = 3;
    this._PageList = new Array();

    var Parser = new TPDFParser(this._ObjectMem, this._PageList);

    // 暗号の確認
    if (PDFAnalyst.Encrypt) {
      PDFAnalyst.LoadError(PDFDESIGNER_ERROR_025);
    }

    // ページ範囲の確認
    if (begin < 1 || end > PDFAnalyst.PageCount || begin > end) {
      PDFAnalyst.LoadError(PDFDESIGNER_ERROR_030);
    }

    // 全範囲の確認
    if (begin == 1 && PDFAnalyst.PageCount == end) {
      PDFAnalyst.LoadError(PDFDESIGNER_ERROR_035);
    }

    // PDFのバージョンを書き込む
    AStream.WriteString(PDFVersion + "\n");

    // 最初のヘッダ部分は後で書き込む
    this._ObjectMem.ObjectIndex = this._ObjectMem.ObjectIndex + 2;

    // 全ページのIDを列挙 ---------------------------------------------
    var PageIDList = new Array();
    PDFAnalyst.GetPageInfo(PageIDList);

    // 削除するページIDを消す -----------------------------------------
    for (var i = 0; i < PDFAnalyst.PageCount; i++) {
      if (!(i + 1 >= begin && i + 1 <= end)) {
        ObjectList[ObjectList.length] = PageIDList[i];
      }
    }

    PageIDList = new Array();
    for (var i = 0; i < ObjectList.length; i++) {
      PageIDList[PageIDList.length] = parseInt(ObjectList[i], 10);
    }

    // 使用しているオブジェクトを列挙
    for (var i = 0; i < PageIDList.length; i++) {
      Parser.GetPageInObjectList(PDFAnalyst, PageIDList[i], ObjectList);
    }

    // 重複ID抹消
    var ObjectIDList = PDF_OverlappingCut(ObjectList);

    // ページの書き込み ---------------------------------------------
    for (var i = 0; i < PageIDList.length; i++) {
      Parser.WritePDFPage(PDFAnalyst, PageIDList[i], AStream, ObjectIDList, this._BassID);
    }

    // ページで使用されているオブジェクトの書き込み -----------------
    var len = ObjectIDList.length;
    for (var i = PageIDList.length; i < len; i++) {
      Parser.WritePDFObject(PDFAnalyst, ObjectIDList[i], AStream, ObjectIDList, this._BassID);
    }

    // ヘッダーの書き込み
    Parser.WritePDFHedaer(AStream, this._ObjectMem, this.View, this._PageList[0]);

    // フッターの書き込み
    Parser.WritePDFFooter(AStream, this.Info);

    // ファイルのダウンロード
    AStream.SaveToFile(FileName);
  },
};

////////////////////////////////////////////////////////////////////////////////
// TPDFRotatePage
////////////////////////////////////////////////////////////////////////////////

// ---------------------
//  TPDFRotatePage
// ---------------------
function TPDFRotatePage() {
  // Praivate
  this._ObjectMem = new TPDFObjMemManager();
}

// ---------------------
//  TPDFRotatePage.Method
// ---------------------
TPDFRotatePage.prototype = {
  // ページの回転(Rotate 1:右90度 2:左90度 3:180度)
  SaveToFile: function (FileName, PDFAnalyst, Rotate, begin, end) {
    var Generation = new Array();
    var PageIDList = new Array();
    var AStream = new TFileStream();

    // クロスリファレンステーブルの書き込み
    function WriteCrossReferenceTable(ObjectMem) {
      var i;

      ObjectMem.ObjectPosArray[ObjectMem.ObjectIndex] = AStream.getFileSize();
      AStream.WriteString("xref\n");
      AStream.WriteString("0 " + (ObjectMem.ObjectIndex + 1) + "\n");
      AStream.WriteString("0000000000 65535 f \n");
      for (var i = 0; i < ObjectMem.ObjectPosArray.length - 1; i++) {
        AStream.WriteString(
          PDF_ConvertObjectPos([ObjectMem.ObjectPosArray[i]], 10) +
            " " +
            PDF_ConvertObjectPos([Generation[i]], 5) +
            " n \n"
        );
      }
    }

    // オブジェクトIDはページIDであるかどうか
    function IsPageID(index) {
      for (var i = 0; i < PageIDList.length; i++) {
        if (PageIDList[i] == index) {
          return true;
        }
      }
      return false;
    }

    // ページの回転角度を変更する
    function ChangePageRotate(AStream, ObjectID, ObjectSize, childNumber, ARotate, ObjectMem) {
      var PrePos;

      // ストリームのコピー
      function CopyStream() {
        var NextPos;

        NextPos = PDFAnalyst.Stream.Pos;

        if (NextPos == PrePos) return;
        PDFAnalyst.Stream.Pos = PrePos;
        AStream.WriteStream(PDFAnalyst.Stream, PrePos, NextPos);

        PDFAnalyst.Stream.Pos = NextPos;
      }

      var P, C;
      var Rotatebool = false;
      var StreamSize = 0;
      var MainPrePos = PDFAnalyst.Stream.Pos;

      PDFAnalyst.Stream.Pos = parseInt(PDFAnalyst.ObjectPosArray[ObjectID], 10);
      PDF_TopLineSkip(PDFAnalyst.Stream);

      // 先頭のIDを書き込む
      AStream.WriteString(ObjectMem.ObjectIndex + 1 + " " + childNumber + " obj\n");

      while (true) {
        PrePos = PDFAnalyst.Stream.Pos;
        P = PDF_GetString(PDFAnalyst.Stream);

        if (P == "") continue;

        // コメントのスキップ ----------------------------------------
        if (P == "%") {
          PDF_CommnetSkip(PDFAnalyst.Stream);
          continue;
          // テキストのスキップ ----------------------------------------
        } else if (P == "(") {
          PDF_TextSkip(PDFAnalyst.Stream);
          // ページの回転 ----------------------------------------------
        } else if (P == "/Rotate") {
          Rotatebool = true;

          // ページの回転角度の取得
          P = PDF_GetString(PDFAnalyst.Stream);
          C = PDF_StrToIntDef(P, 0);

          // 回転角度の直前までコピーする
          PDFAnalyst.Stream.Pos = PDFAnalyst.Stream.Pos - P.length;
          CopyStream();

          // 右90
          if (ARotate == 1) {
            if (C + 90 >= 360) {
              ARotate = C + 90 - 360;
            } else {
              ARotate = C + 90;
            }
            // 左90
          } else if (ARotate == 2) {
            if (C - 90 < 0) {
              ARotate = 270;
            } else {
              ARotate = C - 90;
            }
            // 上下反転
          } else if (ARotate == 3) {
            if (C + 180 >= 360) {
              ARotate = C + 180 - 360;
            } else {
              ARotate = C + 180;
            }
          } else {
            ARotate = 0;
          }

          AStream.WriteString(ARotate + "\n");
          PDFAnalyst.Stream.Pos = PDFAnalyst.Stream.Pos + P.length;
          continue;
          // ストリームのサイズを取得 ----------------------------------
        } else if (P == "/Length") {
          StreamSize = PDFAnalyst.GetObjectType_Integer(PDFAnalyst.Stream);
          // ストリームをスキップ --------------------------------------
        } else if (P == "stream") {
          // none
          // オブジェクトの終端子  -------------------------------------
        } else if (P == "endobj") {
          CopyStream();

          // 書き込んでいない場合
          if (!Rotatebool) {
            // TFileStreamは読み込み禁止なのでTMemoryStreamに展開
            var MemoryStream = new TMemoryStream(AStream, 0, AStream.getFileSize());
            MemoryStream.Pos = MemoryStream.getFileSize();
            MemoryStream.Pos = MemoryStream.Pos - "endobj".length;

            // >> の前まで戻る
            while (true) {
              C = MemoryStream.ReadString(1);
              if (C == ">") {
                MemoryStream.Pos = MemoryStream.Pos - 2;
                MemoryStream.Stream = MemoryStream.Stream.subarray(0, MemoryStream.Pos);
                break;
              } else {
                MemoryStream.Pos = MemoryStream.Pos - 2;
              }
            }

            // TFileStreamの書き換え
            AStream.Rewrite(MemoryStream);

            // 右90
            if (ARotate == 1) {
              ARotate = 90;
              // 左90
            } else if (ARotate == 2) {
              ARotate = 270;
              // 上下反転
            } else if (ARotate == 3) {
              ARotate = 180;
            } else {
              ARotate = 0;
            }

            AStream.WriteString("\n");
            AStream.WriteString("/Rotate " + ARotate + "\n");
            AStream.WriteString(">>\n");
            AStream.WriteString("endobj");
          }
          break;
        }
        CopyStream();
      }
      PDFAnalyst.Stream.Pos = MainPrePos;
    }
    var ObjectList = new Array();
    var ObjectSize;

    // 暗号の確認
    if (PDFAnalyst.Encrypt) {
      PDFAnalyst.LoadError(PDFDESIGNER_ERROR_025);
    }

    // ページ範囲の確認
    if (begin < 1 || end > PDFAnalyst.PageCount || begin > end) {
      PDFAnalyst.LoadError(PDFDESIGNER_ERROR_030);
    }

    // 回転範囲の確認
    if (!(Rotate >= 1 && Rotate <= 3)) {
      PDFAnalyst.LoadError(PDFDESIGNER_ERROR_040);
    }

    // PDFのバージョンを書き込む
    AStream.WriteString(PDFAnalyst.Version + "\n");

    // 使用しているページIDを列挙 -----------------------------------------
    PDFAnalyst.GetPageInfo(ObjectList);
    for (var i = begin - 1; i < end; i++) {
      PageIDList[PageIDList.length] = parseInt(ObjectList[i], 10);
    }

    // オブジェクトデータの書き込み ---------------------------------------
    for (var i = 1; i < PDFAnalyst.ObjectPosArray.length; i++) {
      // 削除済みオブジェクトでない場合 ---------------------------------
      if (!PDFAnalyst.DeleteObject[i]) {
        // オブジェクト世代番号を取得する
        PDFAnalyst.Stream.Pos = parseInt(PDFAnalyst.ObjectPosArray[this._ObjectMem.ObjectIndex + 1], 10);
        // オブジェクト番号
        PDF_GetString(PDFAnalyst.Stream);
        // オブジェクト世代番号
        Generation[this._ObjectMem.ObjectIndex] = parseInt(PDF_GetString(PDFAnalyst.Stream), 10);

        this._ObjectMem.ObjectPosArray[this._ObjectMem.ObjectIndex] = AStream.getFileSize();

        // オブジェクトのサイズを取得
        ObjectSize = PDFAnalyst.GetObjectSize(i);

        // オブジェクトIDがページの場合は内容を変更する
        if (IsPageID(i)) {
          ChangePageRotate(AStream, i, ObjectSize, Generation[this._ObjectMem.ObjectIndex], Rotate, this._ObjectMem);
        } else {
          // オブジェクトを丸ごとコピー
          PDFAnalyst.Stream.Pos = parseInt(PDFAnalyst.ObjectPosArray[i], 10);
          AStream.WriteStream(PDFAnalyst.Stream, PDFAnalyst.Stream.Pos, PDFAnalyst.Stream.Pos + ObjectSize);
        }

        AStream.WriteString("\n");
        // 削除済みオブジェクトの場合 -------------------------------------
      } else {
        // 削除済みオブジェクトを使用中オブジェクトに変換
        this._ObjectMem.ObjectPosArray[this._ObjectMem.ObjectIndex] = AStream.Pos;
        AStream.WriteString(this._ObjectMem.ObjectIndex + 1 + " 0 obj\n");
        AStream.WriteString("<<\n");
        AStream.WriteString(">>\n");
        AStream.WriteString("endobj\n");
        Generation[this._ObjectMem.ObjectIndex] = 0;
      }
      this._ObjectMem.ObjectIndex++;
    }

    // クロスレファレンステーブルの設定  ----------------------------------
    WriteCrossReferenceTable(this._ObjectMem);

    // トレイヤーの設定 ---------------------------------------------------
    AStream.WriteString("trailer\n");
    AStream.WriteString("<<\n");
    AStream.WriteString("/Size " + (this._ObjectMem.ObjectIndex + 1) + "\n");

    if (PDFAnalyst.InfoID != -1) {
      AStream.WriteString("/Info " + PDFAnalyst.InfoID + " 0 R\n");
    }

    AStream.WriteString("/Root " + PDFAnalyst.RootID + " 0 R\n");
    AStream.WriteString(">>\n");
    AStream.WriteString("startxref\n");
    AStream.WriteString(this._ObjectMem.ObjectPosArray[this._ObjectMem.ObjectIndex] + "\n");
    AStream.WriteString("%%EOF\n");

    // ファイルのダウンロード
    AStream.SaveToFile(FileName);
  },
};

////////////////////////////////////////////////////////////////////////////////
// TPDFInfoMaker
////////////////////////////////////////////////////////////////////////////////

// ---------------------
//  TPDFInfoMaker
// ---------------------
function TPDFInfoMaker() {
  // Praivate
  this._ObjectMem = new TPDFObjMemManager();

  // Public Property
  this.Info = new TPDFDocInfo();
  this.View = new TPDFDocView();
}

// ---------------------
//  TPDFInfoMaker.Method
// ---------------------
TPDFInfoMaker.prototype = {
  // ページIDからページ番号を取得
  PageIDtoPageNumber: function (PageID, PageList) {
    var P = parseInt(PageID, 10);

    for (var i = 0; i < PageList.length; i++) {
      if (P == parseInt(PageList[i], 10)) {
        return i + 1;
      }
    }

    return -1;
  },

  // ページ番号からページIDを取得
  PageNumbertoPageID: function (Number, PageList) {
    var N = Number - 1;

    if (N >= 0 && N < PageList.length) {
      return parseInt(PageList[N], 10);
    } else {
      return -1;
    }
  },

  // 文書情報の変更
  SaveToFile: function (FileName, PDFAnalyst) {
    var AStream = new TFileStream();

    // 暗号の確認
    if (PDFAnalyst.Encrypt) {
      PDFAnalyst.LoadError(PDFDESIGNER_ERROR_025);
    }

    this._ObjectMem.ObjectIndex = PDFAnalyst.ObjectPosArray.length - 1;
    var PDFParser = new TPDFParser(this._ObjectMem, null);

    // 以前のファイルを読み込む
    PDFAnalyst.Stream.Pos = 0;
    AStream.WriteStream(PDFAnalyst.Stream, "%PDF-".length, PDFAnalyst.Stream.FileSize);
    AStream.Pos = AStream.getFileSize();

    // ヘッダーの書き込み
    PDFParser.WritePDFHedaer_Maker(PDFAnalyst, AStream, this._ObjectMem, this.View, false);

    // フッターの書き込み
    PDFParser.WritePDFFooter_Maker(PDFAnalyst, AStream, this._ObjectMem, this.Info);

    // 以前のInfoを抹消する
    if (PDFAnalyst.InfoID != -1) {
      PDFParser.WriteDummyInfo(PDFAnalyst, AStream);
    }

    // ファイルのダウンロード
    AStream.SaveToFile(FileName);
  },
};

////////////////////////////////////////////////////////////////////////////////
// TPDFNode
////////////////////////////////////////////////////////////////////////////////

// ---------------------
//  TPDFNode
// ---------------------
// 定义 TPDFNode 类
export class TPDFNode {
  constructor(vParent, vLevel, vCaption, vPage, vShowPos, vURL, vBold, vItalic, vColor) {
    // 私有属性
    this._ID;

    // 公有属性
    this.Page = vPage; // 表示的页码(1,2,3 ... N)
    this.ShowPos = vShowPos; // 显示的页面位置(推荐使用0)
    this.Caption = vCaption; // 书签标题
    this.URL = vURL; // URL(仅当Page为-1时有效)
    this.Level = vLevel; // 层级(最顶层(Root)为0，最大层级为4)
    this.Italic = vItalic; // 斜体 true/false
    this.Bold = vBold; // 加粗 true/false
    this.Color = vColor; // 标题颜色(TColor)，可选择性指定为null

    this.Parent = vParent; // 父节点
    this.ChildNodes = new TPDFNodeList(); // 子节点列表
  }

  // 获取指定索引的子节点
  Get(Index) {
    if (this.ChildNodes.GetCount() == 0) {
      throw PDFDESIGNER_ERROR_050;
    }

    if (Index < 0 || Index > this.ChildNodes.GetCount() - 1) {
      throw PDFDESIGNER_ERROR_051;
    }

    return this.ChildNodes.Get(Index);
  }

  // 添加子节点
  AddChild(vCaption, vPage, vShowPos, vURL, vBold, vItalic, vColor) {
    if (this.Level >= 4) {
      throw PDFDESIGNER_ERROR_052;
    }
    return this.ChildNodes.Add(this, this.Level + 1, vCaption, vPage, vShowPos, vURL, vBold, vItalic, vColor);
  }

  // 获取子节点数量
  GetCount() {
    return this.ChildNodes.GetCount();
  }

  // 获取所有子节点数量
  GetChildCount() {
    let Result = 0;

    if (this.ChildNodes.GetCount() == 0) {
      return Result;
    } else {
      // 获取自身的子节点数量
      Result = this.ChildNodes.GetCount();
      for (let i = 0; i < this.ChildNodes.GetCount(); i++) {
        const PDFNode = this.ChildNodes.Get(i);
        Result = Result + PDFNode.GetChildCount();
      }
    }
    return Result;
  }
}

////////////////////////////////////////////////////////////////////////////////
// TPDFNodeList
////////////////////////////////////////////////////////////////////////////////

// ---------------------
//  TPDFNodeList
// ---------------------
function TPDFNodeList() {
  // Praivate
  this._list = new Array();
}

// ---------------------
//  TPDFNodeList.Method
// ---------------------
TPDFNodeList.prototype = {
  GetCount: function () {
    return this._list.length;
  },

  Add: function (vParent, vLevel, vCaption, vPage, vShowPos, vURL, vBold, vItalic, vColor) {
    var PDFNode = new TPDFNode(vParent, vLevel, vCaption, vPage, vShowPos, vURL, vBold, vItalic, vColor);
    this._list[this._list.length] = PDFNode;
    return PDFNode;
  },

  Get: function (Index) {
    if (this._list.length == 0) {
      throw PDFDESIGNER_ERROR_053;
    }

    if (Index < 0 || Index > this._list.length - 1) {
      throw PDFDESIGNER_ERROR_051;
    }
    return this._list[Index];
  },
};

////////////////////////////////////////////////////////////////////////////////
// TPDFOutLineManager
////////////////////////////////////////////////////////////////////////////////
// ---------------------
//  TPDFOutLineManager
// ---------------------
class TPDFOutLineManager {
  // Private
  _PageList = [];

  // Public Property
  Node = new TPDFNodeList();

  // Get method
  Get(Index) {
    if (this.Node.GetCount() == 0) {
      throw PDFDESIGNER_ERROR_053;
    }

    if (Index < 0 || Index > this.Node.GetCount() - 1) {
      throw PDFDESIGNER_ERROR_051;
    }
    return this.Node.Get(Index);
  }

  // AddRoot method
  AddRoot(vCaption, vPage, vShowPos, vURL, vBold, vItalic, vColor) {
    return this.Node.Add(null, 0, vCaption, vPage, vShowPos, vURL, vBold, vItalic, vColor);
  }

  // GetCount method
  GetCount() {
    return this.Node.GetCount();
  }

  // GetNodeCount method
  GetNodeCount() {
    let Result = this.Node.GetCount();

    for (let i = 0; i < this.Node.GetCount(); i++) {
      let PDFNode = this.Node.Get(i);
      Result = Result + PDFNode.GetChildCount();
    }
    return Result;
  }

  // GetFirstNode method
  GetFirstNode() {
    if (this.Node.GetCount() == 0) {
      return null;
    } else {
      return this.Node.Get(0);
    }
  }

  // GetLastNode method
  GetLastNode() {
    let PDFNode;

    if (this.Node.GetCount() == 0) {
      return null;
    } else {
      // Get the last RootNode
      PDFNode = this.Node.Get(this.Node.GetCount() - 1);
      while (true) {
        if (PDFNode.GetCount() != 0) {
          PDFNode = PDFNode.Get(PDFNode.GetCount() - 1);
        } else {
          break;
        }
      }
      return PDFNode;
    }
  }

  // SaveToStream method
  SaveToStream(PDFAnalyst, AStream, ObjectMem) {
    let Colors;
    let PageHeight;
    let PDFCode = new TPDFCode();

    // GetPDFColor function
    function GetPDFColor(R, G, B, Brush) {
      if (Brush == "") {
        return R / 255 + " " + G / 255 + " " + B / 255;
      } else {
        return R / 255 + " " + G / 255 + " " + B / 255 + " " + Brush;
      }
    }

    // ChildLoop function
    function ChildLoop(PDFNode, PageList) {
      let ChildNode, ChildPrevID;

      ChildPrevID = -1;

      // Child Node Count
      for (let i = 0; i < PDFNode.GetCount(); i++) {
        ChildNode = PDFNode.ChildNodes.Get(i);
        ChildNode._ID = ObjectMem.ObjectIndex + 1;

        ObjectMem.ObjectPosArray[ObjectMem.ObjectIndex] = AStream.getFileSize();
        AStream.WriteString(ObjectMem.ObjectIndex + 1 + " 0 obj\n", [ObjectMem.ObjectIndex + 1]);
        AStream.WriteString("<<\n");

        // Parent Object
        AStream.WriteString("/Parent " + ChildNode.Parent._ID + " 0 R\n");

        // Open Action
        if (ChildNode.Page != -1) {
          // Check page
          if (ChildNode.Page > PageList.length) {
            throw PDFDESIGNER_ERROR_030;
          }

          if (ChildNode.ShowPos < 0) {
            AStream.WriteString("/Dest [ " + PageList[ChildNode.Page - 1] + " 0 R /XYZ null null null ]\n");
          } else {
            // Get page height
            let MediaBox = PDFAnalyst.GetMediaBox(PageList[ChildNode.Page - 1]);
            PageHeight = PDF_GetMediaBoxRect(MediaBox).Bottom;

            if (PageHeight != -1) {
              AStream.WriteString(
                "/Dest [ " +
                  PageList[ChildNode.Page - 1] +
                  " 0 R /XYZ null " +
                  (PageHeight - ChildNode.ShowPos) +
                  " null ]\n"
              );
            } else {
              AStream.WriteString("/Dest [ " + PageList[ChildNode.Page - 1] + " 0 R /XYZ null null null ]\n");
            }
          }
        } else {
          AStream.WriteString("/A << /S /URI /URI (" + ChildNode.URL + ") >>\n");
        }

        // Title
        AStream.WriteString("/Title (" + PDFCode.PDFDocEncoding(ChildNode.Caption) + ")\n");

        // Root Node with Child Nodes
        if (ChildNode.GetCount() != 0) {
          AStream.WriteString("/First " + (ObjectMem.ObjectIndex + 2) + " 0 R\n");
          AStream.WriteString("/Last " + (ObjectMem.ObjectIndex + 1 + ChildNode.GetChildCount()) + " 0 R\n");
        }

        // Next Root Node
        if (i != PDFNode.GetCount() - 1) {
          AStream.WriteString("/Next " + (ObjectMem.ObjectIndex + 2 + ChildNode.GetChildCount()) + " 0 R\n");
        }

        // Previous Root Node
        if (i != 0) {
          AStream.WriteString("/Prev " + ChildPrevID + " 0 R\n");
        }
        // Root Node Child Count
        AStream.WriteString("/Count " + ChildNode.GetChildCount() + "\n");

        // Bookmark Text Decoration - Effective from PDF 1.4

        // Color
        if (ChildNode.Color != null) {
          AStream.WriteString(
            "/C [" + GetPDFColor(ChildNode.Color.Red, ChildNode.Color.Green, ChildNode.Color.Blue, "") + "]\n"
          );
        }

        // Bold and Italic
        if (ChildNode.Bold && ChildNode.Italic) {
          AStream.WriteString("/F 3\n");
        } else if (ChildNode.Bold && !ChildNode.Italic) {
          AStream.WriteString("/F 2\n");
        } else if (!ChildNode.Bold && ChildNode.Italic) {
          AStream.WriteString("/F 1\n");
        }

        AStream.WriteString(">>\n");
        AStream.WriteString("endobj\n");

        ObjectMem.ObjectIndex++;
        ChildPrevID = ObjectMem.ObjectIndex;

        // If there are more child nodes
        if (ChildNode.Count !== 0) {
          ChildLoop(ChildNode, PageList);
        }
      }
    }

    let RootID, PrevID;
    let RootPDFNode;
    let Result = -1;

    PDFAnalyst.GetPageInfo(this._PageList);

    if (this.GetCount() == 0) return Result;
    Result = ObjectMem.ObjectIndex + 1;

    PrevID = -1;

    let NodeCnt = this.GetNodeCount(); // Total number of nodes
    let RootCnt = this.GetCount(); // Number of root nodes

    // Parent Object
    ObjectMem.ObjectPosArray[ObjectMem.ObjectIndex] = AStream.getFileSize();

    AStream.WriteString(ObjectMem.ObjectIndex + 1 + " 0 obj\n");
    AStream.WriteString("<<\n");
    AStream.WriteString("/Type /Outlines\n");

    if (NodeCnt != 0) {
      AStream.WriteString("/First " + (ObjectMem.ObjectIndex + 2) + " 0 R\n");
      AStream.WriteString("/Last " + (ObjectMem.ObjectIndex + 1 + NodeCnt) + " 0 R\n");
    }

    AStream.WriteString("/Count " + NodeCnt + "\n");

    AStream.WriteString(">>\n");
    AStream.WriteString("endobj\n");

    ObjectMem.ObjectIndex++;

    // Parent Object
    RootID = ObjectMem.ObjectIndex;

    // Number of root nodes
    for (let i = 0; i < RootCnt; i++) {
      RootPDFNode = this.Node.Get(i);
      RootPDFNode._ID = ObjectMem.ObjectIndex + 1;
      ObjectMem.ObjectPosArray[ObjectMem.ObjectIndex] = AStream.getFileSize();

      AStream.WriteString(ObjectMem.ObjectIndex + 1 + " 0 obj\n");
      AStream.WriteString("<<\n");

      // Parent
      AStream.WriteString("/Parent " + RootID + " 0 R\n");

      // Open Action
      if (RootPDFNode.Page != -1) {
        // Check page
        if (RootPDFNode.Page > this._PageList.length) {
          throw PDFDESIGNER_ERROR_030;
        }

        if (RootPDFNode.ShowPos < 0) {
          AStream.WriteString("/Dest [ " + this._PageList[RootPDFNode.Page - 1] + " 0 R /XYZ null null null ]\n");
        } else {
          // Get page height
          let MediaBox = PDFAnalyst.GetMediaBox(this._PageList[RootPDFNode.Page - 1]);
          PageHeight = PDF_GetMediaBoxRect(MediaBox).Bottom;

          if (PageHeight != -1) {
            AStream.WriteString(
              "/Dest [ " +
                this._PageList[RootPDFNode.Page - 1] +
                " 0 R /XYZ null " +
                (PageHeight - RootPDFNode.ShowPos) +
                " null ]\n"
            );
          } else {
            AStream.WriteString("/Dest [ " + this._PageList[RootPDFNode.Page - 1] + " 0 R /XYZ null null null ]\n");
          }
        }
      } else {
        AStream.WriteString("/A << /S /URI /URI (" + RootPDFNode.URL + ") >>\n");
      }

      // Title
      AStream.WriteString("/Title (" + PDFCode.PDFDocEncoding(RootPDFNode.Caption) + ")\n");

      // Root Node with Child Nodes
      if (RootPDFNode.GetCount() != 0) {
        AStream.WriteString("/First " + (ObjectMem.ObjectIndex + 2) + " 0 R\n");
        AStream.WriteString("/Last " + (ObjectMem.ObjectIndex + 1 + RootPDFNode.GetChildCount()) + " 0 R\n");
      }

      // Next Root Node
      if (i != RootCnt - 1) {
        AStream.WriteString("/Next " + (ObjectMem.ObjectIndex + 2 + RootPDFNode.GetChildCount()) + " 0 R\n");
      }

      // Previous Root Node
      if (i != 0) {
        AStream.WriteString("/Prev " + PrevID + " 0 R\n");
      }

      // Root Node Child Count
      AStream.WriteString("/Count " + RootPDFNode.GetChildCount() + "\n");

      // Bookmark Text Decoration - Effective from PDF 1.4

      // Color
      if (RootPDFNode.Color != null) {
        AStream.WriteString(
          "/C [" + GetPDFColor(RootPDFNode.Color.Red, RootPDFNode.Color.Green, RootPDFNode.Color.Blue, "") + "]\n"
        );
      }

      // Bold and Italic
      if (RootPDFNode.Bold && RootPDFNode.Italic) {
        AStream.WriteString("/F 3\n");
      } else if (RootPDFNode.Bold && !RootPDFNode.Italic) {
        AStream.WriteString("/F 2\n");
      } else if (!RootPDFNode.Bold && RootPDFNode.Italic) {
        AStream.WriteString("/F 1\n");
      }

      AStream.WriteString(">>\n");
      AStream.WriteString("endobj\n");

      ObjectMem.ObjectIndex++;

      PrevID = ObjectMem.ObjectIndex;

      // Root Node with Child Nodes (write recursively)
      if (RootPDFNode.GetCount() != 0) {
        ChildLoop(RootPDFNode, this._PageList);
      }
    }
  }
}

// TPDFOutLineMaker 类
export class TPDFOutLineMaker {
  constructor() {
    // 私有属性
    this._ObjectMem = new TPDFObjMemManager();

    // 公共属性
    this.Info = new TPDFDocInfo();
    this.View = new TPDFDocView();
    this.OutLine = new TPDFOutLineManager();
  }

  // 获取书签列表
  GetOutLineList(PDFAnalyst) {
    const BookMarkList = [];
    const PDFCode = new TPDFCode();

    function EnumBookMark(ObjectID, Level) {
      let P, C;
      let PrePos;
      const FirstNode = [];
      const NextNode = [];

      PrePos = PDFAnalyst.Stream.Pos;
      PDFAnalyst.Stream.Pos = parseInt(PDFAnalyst.ObjectPosArray[ObjectID], 10);

      while (true) {
        P = PDF_GetString(PDFAnalyst.Stream);
        if (P == "") continue;

        // 跳转到第一个子节点
        if (P == "/First") {
          P = PDF_GetString(PDFAnalyst.Stream);
          if (PDFAnalyst.IsObjectID(P)) FirstNode.push(parseInt(P, 10));
          // 跳转到下一个节点
        } else if (P == "/Next") {
          P = PDF_GetString(PDFAnalyst.Stream);
          if (PDFAnalyst.IsObjectID(P)) NextNode.push(parseInt(P, 10));
          // 获取书签的标题
        } else if (P == "/Title") {
          C = PDFCode.GetPDFTextStream(PDFAnalyst.Stream);

          // 未知的格式
          if (C == undefined) break;

          P = "";
          for (let i = 0; i < Level; i++) {
            P = P + "    ";
          }
          BookMarkList.push(P + C);
          // 跳过文本
        } else if (P == "(") {
          PDF_TextSkip(PDFAnalyst.Stream);
          // 对象的结束符
        } else if (P == "endobj") {
          break;
        }
      }

      // 查找子节点
      if (FirstNode.length != 0) {
        for (let i = 0; i < FirstNode.length; i++) {
          EnumBookMark(FirstNode[i], Level + 1);
        }
      }

      // 查找下一个节点
      if (NextNode.length != 0) {
        for (let i = 0; i < NextNode.length; i++) {
          EnumBookMark(NextNode[i], Level);
        }
      }
    }

    // 检查加密
    if (PDFAnalyst.Encrypt) {
      PDFAnalyst.LoadError(PDFDESIGNER_ERROR_025);
    }

    if (PDFAnalyst.OutlinesID != -1) {
      EnumBookMark(PDFAnalyst.OutlinesID, -1);
    }

    return BookMarkList;
  }

  // 保存为文件
  SaveToFile(FileName, PDFAnalyst) {
    const AStream = this.Save(PDFAnalyst);
    // 下载文件
    AStream.SaveToFile(FileName);
  }
  // 保存为文件
  Save(PDFAnalyst) {
    const AStream = new TFileStream();

    // 检查加密
    if (PDFAnalyst.Encrypt) {
      PDFAnalyst.LoadError(PDFDESIGNER_ERROR_025);
    }

    this._ObjectMem.ObjectIndex = PDFAnalyst.ObjectPosArray.length - 1;
    const PDFParser = new TPDFParser(this._ObjectMem, null);

    // 加载先前的文件
    PDFAnalyst.Stream.Pos = 0;
    AStream.WriteStream(PDFAnalyst.Stream, "%PDF-".length, PDFAnalyst.Stream.FileSize);
    AStream.Pos = AStream.getFileSize();

    // 写入头部
    PDFParser.WritePDFHedaer_Maker(PDFAnalyst, AStream, this._ObjectMem, this.View, true);

    // 写入书签
    this.OutLine.SaveToStream(PDFAnalyst, AStream, this._ObjectMem);

    // 写入尾部
    PDFParser.WritePDFFooter_Maker(PDFAnalyst, AStream, this._ObjectMem, this.Info);

    // 移除先前的 Info
    if (PDFAnalyst.InfoID != -1) {
      PDFParser.WriteDummyInfo(PDFAnalyst, AStream);
    }

    return AStream;
  }
}
