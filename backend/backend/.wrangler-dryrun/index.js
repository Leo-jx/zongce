var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined")
    return require.apply(this, arguments);
  throw new Error('Dynamic require of "' + x + '" is not supported');
});
var __commonJS = (cb, mod) => function __require2() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// ../node_modules/bcryptjs/dist/bcrypt.js
var require_bcrypt = __commonJS({
  "../node_modules/bcryptjs/dist/bcrypt.js"(exports, module) {
    (function(global, factory) {
      if (typeof define === "function" && define["amd"])
        define([], factory);
      else if (typeof __require === "function" && typeof module === "object" && module && module["exports"])
        module["exports"] = factory();
      else
        (global["dcodeIO"] = global["dcodeIO"] || {})["bcrypt"] = factory();
    })(exports, function() {
      "use strict";
      var bcrypt4 = {};
      var randomFallback = null;
      function random(len) {
        if (typeof module !== "undefined" && module && module["exports"])
          try {
            return __require("crypto")["randomBytes"](len);
          } catch (e) {
          }
        try {
          var a;
          (self["crypto"] || self["msCrypto"])["getRandomValues"](a = new Uint32Array(len));
          return Array.prototype.slice.call(a);
        } catch (e) {
        }
        if (!randomFallback)
          throw Error("Neither WebCryptoAPI nor a crypto module is available. Use bcrypt.setRandomFallback to set an alternative");
        return randomFallback(len);
      }
      __name(random, "random");
      var randomAvailable = false;
      try {
        random(1);
        randomAvailable = true;
      } catch (e) {
      }
      randomFallback = null;
      bcrypt4.setRandomFallback = function(random2) {
        randomFallback = random2;
      };
      bcrypt4.genSaltSync = function(rounds, seed_length) {
        rounds = rounds || GENSALT_DEFAULT_LOG2_ROUNDS;
        if (typeof rounds !== "number")
          throw Error("Illegal arguments: " + typeof rounds + ", " + typeof seed_length);
        if (rounds < 4)
          rounds = 4;
        else if (rounds > 31)
          rounds = 31;
        var salt = [];
        salt.push("$2a$");
        if (rounds < 10)
          salt.push("0");
        salt.push(rounds.toString());
        salt.push("$");
        salt.push(base64_encode(random(BCRYPT_SALT_LEN), BCRYPT_SALT_LEN));
        return salt.join("");
      };
      bcrypt4.genSalt = function(rounds, seed_length, callback) {
        if (typeof seed_length === "function")
          callback = seed_length, seed_length = void 0;
        if (typeof rounds === "function")
          callback = rounds, rounds = void 0;
        if (typeof rounds === "undefined")
          rounds = GENSALT_DEFAULT_LOG2_ROUNDS;
        else if (typeof rounds !== "number")
          throw Error("illegal arguments: " + typeof rounds);
        function _async(callback2) {
          nextTick(function() {
            try {
              callback2(null, bcrypt4.genSaltSync(rounds));
            } catch (err) {
              callback2(err);
            }
          });
        }
        __name(_async, "_async");
        if (callback) {
          if (typeof callback !== "function")
            throw Error("Illegal callback: " + typeof callback);
          _async(callback);
        } else
          return new Promise(function(resolve, reject) {
            _async(function(err, res) {
              if (err) {
                reject(err);
                return;
              }
              resolve(res);
            });
          });
      };
      bcrypt4.hashSync = function(s, salt) {
        if (typeof salt === "undefined")
          salt = GENSALT_DEFAULT_LOG2_ROUNDS;
        if (typeof salt === "number")
          salt = bcrypt4.genSaltSync(salt);
        if (typeof s !== "string" || typeof salt !== "string")
          throw Error("Illegal arguments: " + typeof s + ", " + typeof salt);
        return _hash(s, salt);
      };
      bcrypt4.hash = function(s, salt, callback, progressCallback) {
        function _async(callback2) {
          if (typeof s === "string" && typeof salt === "number")
            bcrypt4.genSalt(salt, function(err, salt2) {
              _hash(s, salt2, callback2, progressCallback);
            });
          else if (typeof s === "string" && typeof salt === "string")
            _hash(s, salt, callback2, progressCallback);
          else
            nextTick(callback2.bind(this, Error("Illegal arguments: " + typeof s + ", " + typeof salt)));
        }
        __name(_async, "_async");
        if (callback) {
          if (typeof callback !== "function")
            throw Error("Illegal callback: " + typeof callback);
          _async(callback);
        } else
          return new Promise(function(resolve, reject) {
            _async(function(err, res) {
              if (err) {
                reject(err);
                return;
              }
              resolve(res);
            });
          });
      };
      function safeStringCompare(known, unknown) {
        var right = 0, wrong = 0;
        for (var i = 0, k = known.length; i < k; ++i) {
          if (known.charCodeAt(i) === unknown.charCodeAt(i))
            ++right;
          else
            ++wrong;
        }
        if (right < 0)
          return false;
        return wrong === 0;
      }
      __name(safeStringCompare, "safeStringCompare");
      bcrypt4.compareSync = function(s, hash) {
        if (typeof s !== "string" || typeof hash !== "string")
          throw Error("Illegal arguments: " + typeof s + ", " + typeof hash);
        if (hash.length !== 60)
          return false;
        return safeStringCompare(bcrypt4.hashSync(s, hash.substr(0, hash.length - 31)), hash);
      };
      bcrypt4.compare = function(s, hash, callback, progressCallback) {
        function _async(callback2) {
          if (typeof s !== "string" || typeof hash !== "string") {
            nextTick(callback2.bind(this, Error("Illegal arguments: " + typeof s + ", " + typeof hash)));
            return;
          }
          if (hash.length !== 60) {
            nextTick(callback2.bind(this, null, false));
            return;
          }
          bcrypt4.hash(s, hash.substr(0, 29), function(err, comp) {
            if (err)
              callback2(err);
            else
              callback2(null, safeStringCompare(comp, hash));
          }, progressCallback);
        }
        __name(_async, "_async");
        if (callback) {
          if (typeof callback !== "function")
            throw Error("Illegal callback: " + typeof callback);
          _async(callback);
        } else
          return new Promise(function(resolve, reject) {
            _async(function(err, res) {
              if (err) {
                reject(err);
                return;
              }
              resolve(res);
            });
          });
      };
      bcrypt4.getRounds = function(hash) {
        if (typeof hash !== "string")
          throw Error("Illegal arguments: " + typeof hash);
        return parseInt(hash.split("$")[2], 10);
      };
      bcrypt4.getSalt = function(hash) {
        if (typeof hash !== "string")
          throw Error("Illegal arguments: " + typeof hash);
        if (hash.length !== 60)
          throw Error("Illegal hash length: " + hash.length + " != 60");
        return hash.substring(0, 29);
      };
      var nextTick = typeof process !== "undefined" && process && typeof process.nextTick === "function" ? typeof setImmediate === "function" ? setImmediate : process.nextTick : setTimeout;
      function stringToBytes(str) {
        var out = [], i = 0;
        utfx.encodeUTF16toUTF8(function() {
          if (i >= str.length)
            return null;
          return str.charCodeAt(i++);
        }, function(b) {
          out.push(b);
        });
        return out;
      }
      __name(stringToBytes, "stringToBytes");
      var BASE64_CODE = "./ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789".split("");
      var BASE64_INDEX = [
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        0,
        1,
        54,
        55,
        56,
        57,
        58,
        59,
        60,
        61,
        62,
        63,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        2,
        3,
        4,
        5,
        6,
        7,
        8,
        9,
        10,
        11,
        12,
        13,
        14,
        15,
        16,
        17,
        18,
        19,
        20,
        21,
        22,
        23,
        24,
        25,
        26,
        27,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        28,
        29,
        30,
        31,
        32,
        33,
        34,
        35,
        36,
        37,
        38,
        39,
        40,
        41,
        42,
        43,
        44,
        45,
        46,
        47,
        48,
        49,
        50,
        51,
        52,
        53,
        -1,
        -1,
        -1,
        -1,
        -1
      ];
      var stringFromCharCode = String.fromCharCode;
      function base64_encode(b, len) {
        var off = 0, rs = [], c1, c2;
        if (len <= 0 || len > b.length)
          throw Error("Illegal len: " + len);
        while (off < len) {
          c1 = b[off++] & 255;
          rs.push(BASE64_CODE[c1 >> 2 & 63]);
          c1 = (c1 & 3) << 4;
          if (off >= len) {
            rs.push(BASE64_CODE[c1 & 63]);
            break;
          }
          c2 = b[off++] & 255;
          c1 |= c2 >> 4 & 15;
          rs.push(BASE64_CODE[c1 & 63]);
          c1 = (c2 & 15) << 2;
          if (off >= len) {
            rs.push(BASE64_CODE[c1 & 63]);
            break;
          }
          c2 = b[off++] & 255;
          c1 |= c2 >> 6 & 3;
          rs.push(BASE64_CODE[c1 & 63]);
          rs.push(BASE64_CODE[c2 & 63]);
        }
        return rs.join("");
      }
      __name(base64_encode, "base64_encode");
      function base64_decode(s, len) {
        var off = 0, slen = s.length, olen = 0, rs = [], c1, c2, c3, c4, o, code;
        if (len <= 0)
          throw Error("Illegal len: " + len);
        while (off < slen - 1 && olen < len) {
          code = s.charCodeAt(off++);
          c1 = code < BASE64_INDEX.length ? BASE64_INDEX[code] : -1;
          code = s.charCodeAt(off++);
          c2 = code < BASE64_INDEX.length ? BASE64_INDEX[code] : -1;
          if (c1 == -1 || c2 == -1)
            break;
          o = c1 << 2 >>> 0;
          o |= (c2 & 48) >> 4;
          rs.push(stringFromCharCode(o));
          if (++olen >= len || off >= slen)
            break;
          code = s.charCodeAt(off++);
          c3 = code < BASE64_INDEX.length ? BASE64_INDEX[code] : -1;
          if (c3 == -1)
            break;
          o = (c2 & 15) << 4 >>> 0;
          o |= (c3 & 60) >> 2;
          rs.push(stringFromCharCode(o));
          if (++olen >= len || off >= slen)
            break;
          code = s.charCodeAt(off++);
          c4 = code < BASE64_INDEX.length ? BASE64_INDEX[code] : -1;
          o = (c3 & 3) << 6 >>> 0;
          o |= c4;
          rs.push(stringFromCharCode(o));
          ++olen;
        }
        var res = [];
        for (off = 0; off < olen; off++)
          res.push(rs[off].charCodeAt(0));
        return res;
      }
      __name(base64_decode, "base64_decode");
      var utfx = function() {
        "use strict";
        var utfx2 = {};
        utfx2.MAX_CODEPOINT = 1114111;
        utfx2.encodeUTF8 = function(src, dst) {
          var cp = null;
          if (typeof src === "number")
            cp = src, src = /* @__PURE__ */ __name(function() {
              return null;
            }, "src");
          while (cp !== null || (cp = src()) !== null) {
            if (cp < 128)
              dst(cp & 127);
            else if (cp < 2048)
              dst(cp >> 6 & 31 | 192), dst(cp & 63 | 128);
            else if (cp < 65536)
              dst(cp >> 12 & 15 | 224), dst(cp >> 6 & 63 | 128), dst(cp & 63 | 128);
            else
              dst(cp >> 18 & 7 | 240), dst(cp >> 12 & 63 | 128), dst(cp >> 6 & 63 | 128), dst(cp & 63 | 128);
            cp = null;
          }
        };
        utfx2.decodeUTF8 = function(src, dst) {
          var a, b, c, d, fail2 = /* @__PURE__ */ __name(function(b2) {
            b2 = b2.slice(0, b2.indexOf(null));
            var err = Error(b2.toString());
            err.name = "TruncatedError";
            err["bytes"] = b2;
            throw err;
          }, "fail");
          while ((a = src()) !== null) {
            if ((a & 128) === 0)
              dst(a);
            else if ((a & 224) === 192)
              (b = src()) === null && fail2([a, b]), dst((a & 31) << 6 | b & 63);
            else if ((a & 240) === 224)
              ((b = src()) === null || (c = src()) === null) && fail2([a, b, c]), dst((a & 15) << 12 | (b & 63) << 6 | c & 63);
            else if ((a & 248) === 240)
              ((b = src()) === null || (c = src()) === null || (d = src()) === null) && fail2([a, b, c, d]), dst((a & 7) << 18 | (b & 63) << 12 | (c & 63) << 6 | d & 63);
            else
              throw RangeError("Illegal starting byte: " + a);
          }
        };
        utfx2.UTF16toUTF8 = function(src, dst) {
          var c1, c2 = null;
          while (true) {
            if ((c1 = c2 !== null ? c2 : src()) === null)
              break;
            if (c1 >= 55296 && c1 <= 57343) {
              if ((c2 = src()) !== null) {
                if (c2 >= 56320 && c2 <= 57343) {
                  dst((c1 - 55296) * 1024 + c2 - 56320 + 65536);
                  c2 = null;
                  continue;
                }
              }
            }
            dst(c1);
          }
          if (c2 !== null)
            dst(c2);
        };
        utfx2.UTF8toUTF16 = function(src, dst) {
          var cp = null;
          if (typeof src === "number")
            cp = src, src = /* @__PURE__ */ __name(function() {
              return null;
            }, "src");
          while (cp !== null || (cp = src()) !== null) {
            if (cp <= 65535)
              dst(cp);
            else
              cp -= 65536, dst((cp >> 10) + 55296), dst(cp % 1024 + 56320);
            cp = null;
          }
        };
        utfx2.encodeUTF16toUTF8 = function(src, dst) {
          utfx2.UTF16toUTF8(src, function(cp) {
            utfx2.encodeUTF8(cp, dst);
          });
        };
        utfx2.decodeUTF8toUTF16 = function(src, dst) {
          utfx2.decodeUTF8(src, function(cp) {
            utfx2.UTF8toUTF16(cp, dst);
          });
        };
        utfx2.calculateCodePoint = function(cp) {
          return cp < 128 ? 1 : cp < 2048 ? 2 : cp < 65536 ? 3 : 4;
        };
        utfx2.calculateUTF8 = function(src) {
          var cp, l = 0;
          while ((cp = src()) !== null)
            l += utfx2.calculateCodePoint(cp);
          return l;
        };
        utfx2.calculateUTF16asUTF8 = function(src) {
          var n = 0, l = 0;
          utfx2.UTF16toUTF8(src, function(cp) {
            ++n;
            l += utfx2.calculateCodePoint(cp);
          });
          return [n, l];
        };
        return utfx2;
      }();
      Date.now = Date.now || function() {
        return +/* @__PURE__ */ new Date();
      };
      var BCRYPT_SALT_LEN = 16;
      var GENSALT_DEFAULT_LOG2_ROUNDS = 10;
      var BLOWFISH_NUM_ROUNDS = 16;
      var MAX_EXECUTION_TIME = 100;
      var P_ORIG = [
        608135816,
        2242054355,
        320440878,
        57701188,
        2752067618,
        698298832,
        137296536,
        3964562569,
        1160258022,
        953160567,
        3193202383,
        887688300,
        3232508343,
        3380367581,
        1065670069,
        3041331479,
        2450970073,
        2306472731
      ];
      var S_ORIG = [
        3509652390,
        2564797868,
        805139163,
        3491422135,
        3101798381,
        1780907670,
        3128725573,
        4046225305,
        614570311,
        3012652279,
        134345442,
        2240740374,
        1667834072,
        1901547113,
        2757295779,
        4103290238,
        227898511,
        1921955416,
        1904987480,
        2182433518,
        2069144605,
        3260701109,
        2620446009,
        720527379,
        3318853667,
        677414384,
        3393288472,
        3101374703,
        2390351024,
        1614419982,
        1822297739,
        2954791486,
        3608508353,
        3174124327,
        2024746970,
        1432378464,
        3864339955,
        2857741204,
        1464375394,
        1676153920,
        1439316330,
        715854006,
        3033291828,
        289532110,
        2706671279,
        2087905683,
        3018724369,
        1668267050,
        732546397,
        1947742710,
        3462151702,
        2609353502,
        2950085171,
        1814351708,
        2050118529,
        680887927,
        999245976,
        1800124847,
        3300911131,
        1713906067,
        1641548236,
        4213287313,
        1216130144,
        1575780402,
        4018429277,
        3917837745,
        3693486850,
        3949271944,
        596196993,
        3549867205,
        258830323,
        2213823033,
        772490370,
        2760122372,
        1774776394,
        2652871518,
        566650946,
        4142492826,
        1728879713,
        2882767088,
        1783734482,
        3629395816,
        2517608232,
        2874225571,
        1861159788,
        326777828,
        3124490320,
        2130389656,
        2716951837,
        967770486,
        1724537150,
        2185432712,
        2364442137,
        1164943284,
        2105845187,
        998989502,
        3765401048,
        2244026483,
        1075463327,
        1455516326,
        1322494562,
        910128902,
        469688178,
        1117454909,
        936433444,
        3490320968,
        3675253459,
        1240580251,
        122909385,
        2157517691,
        634681816,
        4142456567,
        3825094682,
        3061402683,
        2540495037,
        79693498,
        3249098678,
        1084186820,
        1583128258,
        426386531,
        1761308591,
        1047286709,
        322548459,
        995290223,
        1845252383,
        2603652396,
        3431023940,
        2942221577,
        3202600964,
        3727903485,
        1712269319,
        422464435,
        3234572375,
        1170764815,
        3523960633,
        3117677531,
        1434042557,
        442511882,
        3600875718,
        1076654713,
        1738483198,
        4213154764,
        2393238008,
        3677496056,
        1014306527,
        4251020053,
        793779912,
        2902807211,
        842905082,
        4246964064,
        1395751752,
        1040244610,
        2656851899,
        3396308128,
        445077038,
        3742853595,
        3577915638,
        679411651,
        2892444358,
        2354009459,
        1767581616,
        3150600392,
        3791627101,
        3102740896,
        284835224,
        4246832056,
        1258075500,
        768725851,
        2589189241,
        3069724005,
        3532540348,
        1274779536,
        3789419226,
        2764799539,
        1660621633,
        3471099624,
        4011903706,
        913787905,
        3497959166,
        737222580,
        2514213453,
        2928710040,
        3937242737,
        1804850592,
        3499020752,
        2949064160,
        2386320175,
        2390070455,
        2415321851,
        4061277028,
        2290661394,
        2416832540,
        1336762016,
        1754252060,
        3520065937,
        3014181293,
        791618072,
        3188594551,
        3933548030,
        2332172193,
        3852520463,
        3043980520,
        413987798,
        3465142937,
        3030929376,
        4245938359,
        2093235073,
        3534596313,
        375366246,
        2157278981,
        2479649556,
        555357303,
        3870105701,
        2008414854,
        3344188149,
        4221384143,
        3956125452,
        2067696032,
        3594591187,
        2921233993,
        2428461,
        544322398,
        577241275,
        1471733935,
        610547355,
        4027169054,
        1432588573,
        1507829418,
        2025931657,
        3646575487,
        545086370,
        48609733,
        2200306550,
        1653985193,
        298326376,
        1316178497,
        3007786442,
        2064951626,
        458293330,
        2589141269,
        3591329599,
        3164325604,
        727753846,
        2179363840,
        146436021,
        1461446943,
        4069977195,
        705550613,
        3059967265,
        3887724982,
        4281599278,
        3313849956,
        1404054877,
        2845806497,
        146425753,
        1854211946,
        1266315497,
        3048417604,
        3681880366,
        3289982499,
        290971e4,
        1235738493,
        2632868024,
        2414719590,
        3970600049,
        1771706367,
        1449415276,
        3266420449,
        422970021,
        1963543593,
        2690192192,
        3826793022,
        1062508698,
        1531092325,
        1804592342,
        2583117782,
        2714934279,
        4024971509,
        1294809318,
        4028980673,
        1289560198,
        2221992742,
        1669523910,
        35572830,
        157838143,
        1052438473,
        1016535060,
        1802137761,
        1753167236,
        1386275462,
        3080475397,
        2857371447,
        1040679964,
        2145300060,
        2390574316,
        1461121720,
        2956646967,
        4031777805,
        4028374788,
        33600511,
        2920084762,
        1018524850,
        629373528,
        3691585981,
        3515945977,
        2091462646,
        2486323059,
        586499841,
        988145025,
        935516892,
        3367335476,
        2599673255,
        2839830854,
        265290510,
        3972581182,
        2759138881,
        3795373465,
        1005194799,
        847297441,
        406762289,
        1314163512,
        1332590856,
        1866599683,
        4127851711,
        750260880,
        613907577,
        1450815602,
        3165620655,
        3734664991,
        3650291728,
        3012275730,
        3704569646,
        1427272223,
        778793252,
        1343938022,
        2676280711,
        2052605720,
        1946737175,
        3164576444,
        3914038668,
        3967478842,
        3682934266,
        1661551462,
        3294938066,
        4011595847,
        840292616,
        3712170807,
        616741398,
        312560963,
        711312465,
        1351876610,
        322626781,
        1910503582,
        271666773,
        2175563734,
        1594956187,
        70604529,
        3617834859,
        1007753275,
        1495573769,
        4069517037,
        2549218298,
        2663038764,
        504708206,
        2263041392,
        3941167025,
        2249088522,
        1514023603,
        1998579484,
        1312622330,
        694541497,
        2582060303,
        2151582166,
        1382467621,
        776784248,
        2618340202,
        3323268794,
        2497899128,
        2784771155,
        503983604,
        4076293799,
        907881277,
        423175695,
        432175456,
        1378068232,
        4145222326,
        3954048622,
        3938656102,
        3820766613,
        2793130115,
        2977904593,
        26017576,
        3274890735,
        3194772133,
        1700274565,
        1756076034,
        4006520079,
        3677328699,
        720338349,
        1533947780,
        354530856,
        688349552,
        3973924725,
        1637815568,
        332179504,
        3949051286,
        53804574,
        2852348879,
        3044236432,
        1282449977,
        3583942155,
        3416972820,
        4006381244,
        1617046695,
        2628476075,
        3002303598,
        1686838959,
        431878346,
        2686675385,
        1700445008,
        1080580658,
        1009431731,
        832498133,
        3223435511,
        2605976345,
        2271191193,
        2516031870,
        1648197032,
        4164389018,
        2548247927,
        300782431,
        375919233,
        238389289,
        3353747414,
        2531188641,
        2019080857,
        1475708069,
        455242339,
        2609103871,
        448939670,
        3451063019,
        1395535956,
        2413381860,
        1841049896,
        1491858159,
        885456874,
        4264095073,
        4001119347,
        1565136089,
        3898914787,
        1108368660,
        540939232,
        1173283510,
        2745871338,
        3681308437,
        4207628240,
        3343053890,
        4016749493,
        1699691293,
        1103962373,
        3625875870,
        2256883143,
        3830138730,
        1031889488,
        3479347698,
        1535977030,
        4236805024,
        3251091107,
        2132092099,
        1774941330,
        1199868427,
        1452454533,
        157007616,
        2904115357,
        342012276,
        595725824,
        1480756522,
        206960106,
        497939518,
        591360097,
        863170706,
        2375253569,
        3596610801,
        1814182875,
        2094937945,
        3421402208,
        1082520231,
        3463918190,
        2785509508,
        435703966,
        3908032597,
        1641649973,
        2842273706,
        3305899714,
        1510255612,
        2148256476,
        2655287854,
        3276092548,
        4258621189,
        236887753,
        3681803219,
        274041037,
        1734335097,
        3815195456,
        3317970021,
        1899903192,
        1026095262,
        4050517792,
        356393447,
        2410691914,
        3873677099,
        3682840055,
        3913112168,
        2491498743,
        4132185628,
        2489919796,
        1091903735,
        1979897079,
        3170134830,
        3567386728,
        3557303409,
        857797738,
        1136121015,
        1342202287,
        507115054,
        2535736646,
        337727348,
        3213592640,
        1301675037,
        2528481711,
        1895095763,
        1721773893,
        3216771564,
        62756741,
        2142006736,
        835421444,
        2531993523,
        1442658625,
        3659876326,
        2882144922,
        676362277,
        1392781812,
        170690266,
        3921047035,
        1759253602,
        3611846912,
        1745797284,
        664899054,
        1329594018,
        3901205900,
        3045908486,
        2062866102,
        2865634940,
        3543621612,
        3464012697,
        1080764994,
        553557557,
        3656615353,
        3996768171,
        991055499,
        499776247,
        1265440854,
        648242737,
        3940784050,
        980351604,
        3713745714,
        1749149687,
        3396870395,
        4211799374,
        3640570775,
        1161844396,
        3125318951,
        1431517754,
        545492359,
        4268468663,
        3499529547,
        1437099964,
        2702547544,
        3433638243,
        2581715763,
        2787789398,
        1060185593,
        1593081372,
        2418618748,
        4260947970,
        69676912,
        2159744348,
        86519011,
        2512459080,
        3838209314,
        1220612927,
        3339683548,
        133810670,
        1090789135,
        1078426020,
        1569222167,
        845107691,
        3583754449,
        4072456591,
        1091646820,
        628848692,
        1613405280,
        3757631651,
        526609435,
        236106946,
        48312990,
        2942717905,
        3402727701,
        1797494240,
        859738849,
        992217954,
        4005476642,
        2243076622,
        3870952857,
        3732016268,
        765654824,
        3490871365,
        2511836413,
        1685915746,
        3888969200,
        1414112111,
        2273134842,
        3281911079,
        4080962846,
        172450625,
        2569994100,
        980381355,
        4109958455,
        2819808352,
        2716589560,
        2568741196,
        3681446669,
        3329971472,
        1835478071,
        660984891,
        3704678404,
        4045999559,
        3422617507,
        3040415634,
        1762651403,
        1719377915,
        3470491036,
        2693910283,
        3642056355,
        3138596744,
        1364962596,
        2073328063,
        1983633131,
        926494387,
        3423689081,
        2150032023,
        4096667949,
        1749200295,
        3328846651,
        309677260,
        2016342300,
        1779581495,
        3079819751,
        111262694,
        1274766160,
        443224088,
        298511866,
        1025883608,
        3806446537,
        1145181785,
        168956806,
        3641502830,
        3584813610,
        1689216846,
        3666258015,
        3200248200,
        1692713982,
        2646376535,
        4042768518,
        1618508792,
        1610833997,
        3523052358,
        4130873264,
        2001055236,
        3610705100,
        2202168115,
        4028541809,
        2961195399,
        1006657119,
        2006996926,
        3186142756,
        1430667929,
        3210227297,
        1314452623,
        4074634658,
        4101304120,
        2273951170,
        1399257539,
        3367210612,
        3027628629,
        1190975929,
        2062231137,
        2333990788,
        2221543033,
        2438960610,
        1181637006,
        548689776,
        2362791313,
        3372408396,
        3104550113,
        3145860560,
        296247880,
        1970579870,
        3078560182,
        3769228297,
        1714227617,
        3291629107,
        3898220290,
        166772364,
        1251581989,
        493813264,
        448347421,
        195405023,
        2709975567,
        677966185,
        3703036547,
        1463355134,
        2715995803,
        1338867538,
        1343315457,
        2802222074,
        2684532164,
        233230375,
        2599980071,
        2000651841,
        3277868038,
        1638401717,
        4028070440,
        3237316320,
        6314154,
        819756386,
        300326615,
        590932579,
        1405279636,
        3267499572,
        3150704214,
        2428286686,
        3959192993,
        3461946742,
        1862657033,
        1266418056,
        963775037,
        2089974820,
        2263052895,
        1917689273,
        448879540,
        3550394620,
        3981727096,
        150775221,
        3627908307,
        1303187396,
        508620638,
        2975983352,
        2726630617,
        1817252668,
        1876281319,
        1457606340,
        908771278,
        3720792119,
        3617206836,
        2455994898,
        1729034894,
        1080033504,
        976866871,
        3556439503,
        2881648439,
        1522871579,
        1555064734,
        1336096578,
        3548522304,
        2579274686,
        3574697629,
        3205460757,
        3593280638,
        3338716283,
        3079412587,
        564236357,
        2993598910,
        1781952180,
        1464380207,
        3163844217,
        3332601554,
        1699332808,
        1393555694,
        1183702653,
        3581086237,
        1288719814,
        691649499,
        2847557200,
        2895455976,
        3193889540,
        2717570544,
        1781354906,
        1676643554,
        2592534050,
        3230253752,
        1126444790,
        2770207658,
        2633158820,
        2210423226,
        2615765581,
        2414155088,
        3127139286,
        673620729,
        2805611233,
        1269405062,
        4015350505,
        3341807571,
        4149409754,
        1057255273,
        2012875353,
        2162469141,
        2276492801,
        2601117357,
        993977747,
        3918593370,
        2654263191,
        753973209,
        36408145,
        2530585658,
        25011837,
        3520020182,
        2088578344,
        530523599,
        2918365339,
        1524020338,
        1518925132,
        3760827505,
        3759777254,
        1202760957,
        3985898139,
        3906192525,
        674977740,
        4174734889,
        2031300136,
        2019492241,
        3983892565,
        4153806404,
        3822280332,
        352677332,
        2297720250,
        60907813,
        90501309,
        3286998549,
        1016092578,
        2535922412,
        2839152426,
        457141659,
        509813237,
        4120667899,
        652014361,
        1966332200,
        2975202805,
        55981186,
        2327461051,
        676427537,
        3255491064,
        2882294119,
        3433927263,
        1307055953,
        942726286,
        933058658,
        2468411793,
        3933900994,
        4215176142,
        1361170020,
        2001714738,
        2830558078,
        3274259782,
        1222529897,
        1679025792,
        2729314320,
        3714953764,
        1770335741,
        151462246,
        3013232138,
        1682292957,
        1483529935,
        471910574,
        1539241949,
        458788160,
        3436315007,
        1807016891,
        3718408830,
        978976581,
        1043663428,
        3165965781,
        1927990952,
        4200891579,
        2372276910,
        3208408903,
        3533431907,
        1412390302,
        2931980059,
        4132332400,
        1947078029,
        3881505623,
        4168226417,
        2941484381,
        1077988104,
        1320477388,
        886195818,
        18198404,
        3786409e3,
        2509781533,
        112762804,
        3463356488,
        1866414978,
        891333506,
        18488651,
        661792760,
        1628790961,
        3885187036,
        3141171499,
        876946877,
        2693282273,
        1372485963,
        791857591,
        2686433993,
        3759982718,
        3167212022,
        3472953795,
        2716379847,
        445679433,
        3561995674,
        3504004811,
        3574258232,
        54117162,
        3331405415,
        2381918588,
        3769707343,
        4154350007,
        1140177722,
        4074052095,
        668550556,
        3214352940,
        367459370,
        261225585,
        2610173221,
        4209349473,
        3468074219,
        3265815641,
        314222801,
        3066103646,
        3808782860,
        282218597,
        3406013506,
        3773591054,
        379116347,
        1285071038,
        846784868,
        2669647154,
        3771962079,
        3550491691,
        2305946142,
        453669953,
        1268987020,
        3317592352,
        3279303384,
        3744833421,
        2610507566,
        3859509063,
        266596637,
        3847019092,
        517658769,
        3462560207,
        3443424879,
        370717030,
        4247526661,
        2224018117,
        4143653529,
        4112773975,
        2788324899,
        2477274417,
        1456262402,
        2901442914,
        1517677493,
        1846949527,
        2295493580,
        3734397586,
        2176403920,
        1280348187,
        1908823572,
        3871786941,
        846861322,
        1172426758,
        3287448474,
        3383383037,
        1655181056,
        3139813346,
        901632758,
        1897031941,
        2986607138,
        3066810236,
        3447102507,
        1393639104,
        373351379,
        950779232,
        625454576,
        3124240540,
        4148612726,
        2007998917,
        544563296,
        2244738638,
        2330496472,
        2058025392,
        1291430526,
        424198748,
        50039436,
        29584100,
        3605783033,
        2429876329,
        2791104160,
        1057563949,
        3255363231,
        3075367218,
        3463963227,
        1469046755,
        985887462
      ];
      var C_ORIG = [
        1332899944,
        1700884034,
        1701343084,
        1684370003,
        1668446532,
        1869963892
      ];
      function _encipher(lr, off, P, S) {
        var n, l = lr[off], r = lr[off + 1];
        l ^= P[0];
        n = S[l >>> 24];
        n += S[256 | l >> 16 & 255];
        n ^= S[512 | l >> 8 & 255];
        n += S[768 | l & 255];
        r ^= n ^ P[1];
        n = S[r >>> 24];
        n += S[256 | r >> 16 & 255];
        n ^= S[512 | r >> 8 & 255];
        n += S[768 | r & 255];
        l ^= n ^ P[2];
        n = S[l >>> 24];
        n += S[256 | l >> 16 & 255];
        n ^= S[512 | l >> 8 & 255];
        n += S[768 | l & 255];
        r ^= n ^ P[3];
        n = S[r >>> 24];
        n += S[256 | r >> 16 & 255];
        n ^= S[512 | r >> 8 & 255];
        n += S[768 | r & 255];
        l ^= n ^ P[4];
        n = S[l >>> 24];
        n += S[256 | l >> 16 & 255];
        n ^= S[512 | l >> 8 & 255];
        n += S[768 | l & 255];
        r ^= n ^ P[5];
        n = S[r >>> 24];
        n += S[256 | r >> 16 & 255];
        n ^= S[512 | r >> 8 & 255];
        n += S[768 | r & 255];
        l ^= n ^ P[6];
        n = S[l >>> 24];
        n += S[256 | l >> 16 & 255];
        n ^= S[512 | l >> 8 & 255];
        n += S[768 | l & 255];
        r ^= n ^ P[7];
        n = S[r >>> 24];
        n += S[256 | r >> 16 & 255];
        n ^= S[512 | r >> 8 & 255];
        n += S[768 | r & 255];
        l ^= n ^ P[8];
        n = S[l >>> 24];
        n += S[256 | l >> 16 & 255];
        n ^= S[512 | l >> 8 & 255];
        n += S[768 | l & 255];
        r ^= n ^ P[9];
        n = S[r >>> 24];
        n += S[256 | r >> 16 & 255];
        n ^= S[512 | r >> 8 & 255];
        n += S[768 | r & 255];
        l ^= n ^ P[10];
        n = S[l >>> 24];
        n += S[256 | l >> 16 & 255];
        n ^= S[512 | l >> 8 & 255];
        n += S[768 | l & 255];
        r ^= n ^ P[11];
        n = S[r >>> 24];
        n += S[256 | r >> 16 & 255];
        n ^= S[512 | r >> 8 & 255];
        n += S[768 | r & 255];
        l ^= n ^ P[12];
        n = S[l >>> 24];
        n += S[256 | l >> 16 & 255];
        n ^= S[512 | l >> 8 & 255];
        n += S[768 | l & 255];
        r ^= n ^ P[13];
        n = S[r >>> 24];
        n += S[256 | r >> 16 & 255];
        n ^= S[512 | r >> 8 & 255];
        n += S[768 | r & 255];
        l ^= n ^ P[14];
        n = S[l >>> 24];
        n += S[256 | l >> 16 & 255];
        n ^= S[512 | l >> 8 & 255];
        n += S[768 | l & 255];
        r ^= n ^ P[15];
        n = S[r >>> 24];
        n += S[256 | r >> 16 & 255];
        n ^= S[512 | r >> 8 & 255];
        n += S[768 | r & 255];
        l ^= n ^ P[16];
        lr[off] = r ^ P[BLOWFISH_NUM_ROUNDS + 1];
        lr[off + 1] = l;
        return lr;
      }
      __name(_encipher, "_encipher");
      function _streamtoword(data, offp) {
        for (var i = 0, word = 0; i < 4; ++i)
          word = word << 8 | data[offp] & 255, offp = (offp + 1) % data.length;
        return { key: word, offp };
      }
      __name(_streamtoword, "_streamtoword");
      function _key(key, P, S) {
        var offset = 0, lr = [0, 0], plen = P.length, slen = S.length, sw;
        for (var i = 0; i < plen; i++)
          sw = _streamtoword(key, offset), offset = sw.offp, P[i] = P[i] ^ sw.key;
        for (i = 0; i < plen; i += 2)
          lr = _encipher(lr, 0, P, S), P[i] = lr[0], P[i + 1] = lr[1];
        for (i = 0; i < slen; i += 2)
          lr = _encipher(lr, 0, P, S), S[i] = lr[0], S[i + 1] = lr[1];
      }
      __name(_key, "_key");
      function _ekskey(data, key, P, S) {
        var offp = 0, lr = [0, 0], plen = P.length, slen = S.length, sw;
        for (var i = 0; i < plen; i++)
          sw = _streamtoword(key, offp), offp = sw.offp, P[i] = P[i] ^ sw.key;
        offp = 0;
        for (i = 0; i < plen; i += 2)
          sw = _streamtoword(data, offp), offp = sw.offp, lr[0] ^= sw.key, sw = _streamtoword(data, offp), offp = sw.offp, lr[1] ^= sw.key, lr = _encipher(lr, 0, P, S), P[i] = lr[0], P[i + 1] = lr[1];
        for (i = 0; i < slen; i += 2)
          sw = _streamtoword(data, offp), offp = sw.offp, lr[0] ^= sw.key, sw = _streamtoword(data, offp), offp = sw.offp, lr[1] ^= sw.key, lr = _encipher(lr, 0, P, S), S[i] = lr[0], S[i + 1] = lr[1];
      }
      __name(_ekskey, "_ekskey");
      function _crypt(b, salt, rounds, callback, progressCallback) {
        var cdata = C_ORIG.slice(), clen = cdata.length, err;
        if (rounds < 4 || rounds > 31) {
          err = Error("Illegal number of rounds (4-31): " + rounds);
          if (callback) {
            nextTick(callback.bind(this, err));
            return;
          } else
            throw err;
        }
        if (salt.length !== BCRYPT_SALT_LEN) {
          err = Error("Illegal salt length: " + salt.length + " != " + BCRYPT_SALT_LEN);
          if (callback) {
            nextTick(callback.bind(this, err));
            return;
          } else
            throw err;
        }
        rounds = 1 << rounds >>> 0;
        var P, S, i = 0, j;
        if (Int32Array) {
          P = new Int32Array(P_ORIG);
          S = new Int32Array(S_ORIG);
        } else {
          P = P_ORIG.slice();
          S = S_ORIG.slice();
        }
        _ekskey(salt, b, P, S);
        function next() {
          if (progressCallback)
            progressCallback(i / rounds);
          if (i < rounds) {
            var start = Date.now();
            for (; i < rounds; ) {
              i = i + 1;
              _key(b, P, S);
              _key(salt, P, S);
              if (Date.now() - start > MAX_EXECUTION_TIME)
                break;
            }
          } else {
            for (i = 0; i < 64; i++)
              for (j = 0; j < clen >> 1; j++)
                _encipher(cdata, j << 1, P, S);
            var ret = [];
            for (i = 0; i < clen; i++)
              ret.push((cdata[i] >> 24 & 255) >>> 0), ret.push((cdata[i] >> 16 & 255) >>> 0), ret.push((cdata[i] >> 8 & 255) >>> 0), ret.push((cdata[i] & 255) >>> 0);
            if (callback) {
              callback(null, ret);
              return;
            } else
              return ret;
          }
          if (callback)
            nextTick(next);
        }
        __name(next, "next");
        if (typeof callback !== "undefined") {
          next();
        } else {
          var res;
          while (true)
            if (typeof (res = next()) !== "undefined")
              return res || [];
        }
      }
      __name(_crypt, "_crypt");
      function _hash(s, salt, callback, progressCallback) {
        var err;
        if (typeof s !== "string" || typeof salt !== "string") {
          err = Error("Invalid string / salt: Not a string");
          if (callback) {
            nextTick(callback.bind(this, err));
            return;
          } else
            throw err;
        }
        var minor, offset;
        if (salt.charAt(0) !== "$" || salt.charAt(1) !== "2") {
          err = Error("Invalid salt version: " + salt.substring(0, 2));
          if (callback) {
            nextTick(callback.bind(this, err));
            return;
          } else
            throw err;
        }
        if (salt.charAt(2) === "$")
          minor = String.fromCharCode(0), offset = 3;
        else {
          minor = salt.charAt(2);
          if (minor !== "a" && minor !== "b" && minor !== "y" || salt.charAt(3) !== "$") {
            err = Error("Invalid salt revision: " + salt.substring(2, 4));
            if (callback) {
              nextTick(callback.bind(this, err));
              return;
            } else
              throw err;
          }
          offset = 4;
        }
        if (salt.charAt(offset + 2) > "$") {
          err = Error("Missing salt rounds");
          if (callback) {
            nextTick(callback.bind(this, err));
            return;
          } else
            throw err;
        }
        var r1 = parseInt(salt.substring(offset, offset + 1), 10) * 10, r2 = parseInt(salt.substring(offset + 1, offset + 2), 10), rounds = r1 + r2, real_salt = salt.substring(offset + 3, offset + 25);
        s += minor >= "a" ? "\0" : "";
        var passwordb = stringToBytes(s), saltb = base64_decode(real_salt, BCRYPT_SALT_LEN);
        function finish(bytes) {
          var res = [];
          res.push("$2");
          if (minor >= "a")
            res.push(minor);
          res.push("$");
          if (rounds < 10)
            res.push("0");
          res.push(rounds.toString());
          res.push("$");
          res.push(base64_encode(saltb, saltb.length));
          res.push(base64_encode(bytes, C_ORIG.length * 4 - 1));
          return res.join("");
        }
        __name(finish, "finish");
        if (typeof callback == "undefined")
          return finish(_crypt(passwordb, saltb, rounds));
        else {
          _crypt(passwordb, saltb, rounds, function(err2, bytes) {
            if (err2)
              callback(err2, null);
            else
              callback(null, finish(bytes));
          }, progressCallback);
        }
      }
      __name(_hash, "_hash");
      bcrypt4.encodeBase64 = base64_encode;
      bcrypt4.decodeBase64 = base64_decode;
      return bcrypt4;
    });
  }
});

// src/http.js
var ALLOWED_METHODS = "GET, POST, PUT, DELETE, OPTIONS";
var ALLOWED_HEADERS = "Content-Type, Authorization";
function corsHeaders(env) {
  return {
    "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN || "*",
    "Access-Control-Allow-Methods": ALLOWED_METHODS,
    "Access-Control-Allow-Headers": ALLOWED_HEADERS
  };
}
__name(corsHeaders, "corsHeaders");
function json(data, status = 200, env = null) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...env ? corsHeaders(env) : { "Access-Control-Allow-Origin": "*" }
    }
  });
}
__name(json, "json");
function ok(data, env) {
  return json({ code: 0, msg: "ok", data }, 200, env);
}
__name(ok, "ok");
function fail(msg, status = 400, env = null) {
  return json({ code: status === 401 ? 401 : 1, msg, data: null }, status, env);
}
__name(fail, "fail");
function notFound(env) {
  return fail("\u63A5\u53E3\u4E0D\u5B58\u5728", 404, env);
}
__name(notFound, "notFound");
function preflight(env) {
  return new Response(null, { status: 204, headers: corsHeaders(env) });
}
__name(preflight, "preflight");

// src/db.js
function createDb(binding) {
  if (!binding) {
    throw new Error("\u672A\u7ED1\u5B9A D1 \u6570\u636E\u5E93\uFF0C\u8BF7\u68C0\u67E5 wrangler.toml \u7684 [[d1_databases]] \u914D\u7F6E");
  }
  async function query(sql, params = []) {
    const result = await binding.prepare(sql).bind(...params).all();
    return result.results || [];
  }
  __name(query, "query");
  async function queryOne(sql, params = []) {
    const rows = await query(sql, params);
    return rows.length > 0 ? rows[0] : null;
  }
  __name(queryOne, "queryOne");
  async function run(sql, params = []) {
    return binding.prepare(sql).bind(...params).run();
  }
  __name(run, "run");
  async function insert(sql, params = []) {
    const result = await run(sql, params);
    return { insertId: result.meta.last_row_id, affectedRows: result.meta.changes };
  }
  __name(insert, "insert");
  async function update(sql, params = []) {
    const result = await run(sql, params);
    return { affectedRows: result.meta.changes };
  }
  __name(update, "update");
  return { query, queryOne, insert, update, run };
}
__name(createDb, "createDb");
function now() {
  return (/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace("T", " ");
}
__name(now, "now");

// src/auth.js
var import_bcryptjs = __toESM(require_bcrypt());

// ../node_modules/jose/dist/browser/runtime/webcrypto.js
var webcrypto_default = crypto;
var isCryptoKey = /* @__PURE__ */ __name((key) => key instanceof CryptoKey, "isCryptoKey");

// ../node_modules/jose/dist/browser/lib/buffer_utils.js
var encoder = new TextEncoder();
var decoder = new TextDecoder();
var MAX_INT32 = 2 ** 32;
function concat(...buffers) {
  const size = buffers.reduce((acc, { length }) => acc + length, 0);
  const buf = new Uint8Array(size);
  let i = 0;
  for (const buffer of buffers) {
    buf.set(buffer, i);
    i += buffer.length;
  }
  return buf;
}
__name(concat, "concat");

// ../node_modules/jose/dist/browser/runtime/base64url.js
var encodeBase64 = /* @__PURE__ */ __name((input) => {
  let unencoded = input;
  if (typeof unencoded === "string") {
    unencoded = encoder.encode(unencoded);
  }
  const CHUNK_SIZE = 32768;
  const arr = [];
  for (let i = 0; i < unencoded.length; i += CHUNK_SIZE) {
    arr.push(String.fromCharCode.apply(null, unencoded.subarray(i, i + CHUNK_SIZE)));
  }
  return btoa(arr.join(""));
}, "encodeBase64");
var encode = /* @__PURE__ */ __name((input) => {
  return encodeBase64(input).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}, "encode");
var decodeBase64 = /* @__PURE__ */ __name((encoded) => {
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}, "decodeBase64");
var decode = /* @__PURE__ */ __name((input) => {
  let encoded = input;
  if (encoded instanceof Uint8Array) {
    encoded = decoder.decode(encoded);
  }
  encoded = encoded.replace(/-/g, "+").replace(/_/g, "/").replace(/\s/g, "");
  try {
    return decodeBase64(encoded);
  } catch {
    throw new TypeError("The input to be decoded is not correctly encoded.");
  }
}, "decode");

// ../node_modules/jose/dist/browser/util/errors.js
var JOSEError = class extends Error {
  constructor(message2, options) {
    super(message2, options);
    this.code = "ERR_JOSE_GENERIC";
    this.name = this.constructor.name;
    Error.captureStackTrace?.(this, this.constructor);
  }
};
__name(JOSEError, "JOSEError");
JOSEError.code = "ERR_JOSE_GENERIC";
var JWTClaimValidationFailed = class extends JOSEError {
  constructor(message2, payload, claim = "unspecified", reason = "unspecified") {
    super(message2, { cause: { claim, reason, payload } });
    this.code = "ERR_JWT_CLAIM_VALIDATION_FAILED";
    this.claim = claim;
    this.reason = reason;
    this.payload = payload;
  }
};
__name(JWTClaimValidationFailed, "JWTClaimValidationFailed");
JWTClaimValidationFailed.code = "ERR_JWT_CLAIM_VALIDATION_FAILED";
var JWTExpired = class extends JOSEError {
  constructor(message2, payload, claim = "unspecified", reason = "unspecified") {
    super(message2, { cause: { claim, reason, payload } });
    this.code = "ERR_JWT_EXPIRED";
    this.claim = claim;
    this.reason = reason;
    this.payload = payload;
  }
};
__name(JWTExpired, "JWTExpired");
JWTExpired.code = "ERR_JWT_EXPIRED";
var JOSEAlgNotAllowed = class extends JOSEError {
  constructor() {
    super(...arguments);
    this.code = "ERR_JOSE_ALG_NOT_ALLOWED";
  }
};
__name(JOSEAlgNotAllowed, "JOSEAlgNotAllowed");
JOSEAlgNotAllowed.code = "ERR_JOSE_ALG_NOT_ALLOWED";
var JOSENotSupported = class extends JOSEError {
  constructor() {
    super(...arguments);
    this.code = "ERR_JOSE_NOT_SUPPORTED";
  }
};
__name(JOSENotSupported, "JOSENotSupported");
JOSENotSupported.code = "ERR_JOSE_NOT_SUPPORTED";
var JWEDecryptionFailed = class extends JOSEError {
  constructor(message2 = "decryption operation failed", options) {
    super(message2, options);
    this.code = "ERR_JWE_DECRYPTION_FAILED";
  }
};
__name(JWEDecryptionFailed, "JWEDecryptionFailed");
JWEDecryptionFailed.code = "ERR_JWE_DECRYPTION_FAILED";
var JWEInvalid = class extends JOSEError {
  constructor() {
    super(...arguments);
    this.code = "ERR_JWE_INVALID";
  }
};
__name(JWEInvalid, "JWEInvalid");
JWEInvalid.code = "ERR_JWE_INVALID";
var JWSInvalid = class extends JOSEError {
  constructor() {
    super(...arguments);
    this.code = "ERR_JWS_INVALID";
  }
};
__name(JWSInvalid, "JWSInvalid");
JWSInvalid.code = "ERR_JWS_INVALID";
var JWTInvalid = class extends JOSEError {
  constructor() {
    super(...arguments);
    this.code = "ERR_JWT_INVALID";
  }
};
__name(JWTInvalid, "JWTInvalid");
JWTInvalid.code = "ERR_JWT_INVALID";
var JWKInvalid = class extends JOSEError {
  constructor() {
    super(...arguments);
    this.code = "ERR_JWK_INVALID";
  }
};
__name(JWKInvalid, "JWKInvalid");
JWKInvalid.code = "ERR_JWK_INVALID";
var JWKSInvalid = class extends JOSEError {
  constructor() {
    super(...arguments);
    this.code = "ERR_JWKS_INVALID";
  }
};
__name(JWKSInvalid, "JWKSInvalid");
JWKSInvalid.code = "ERR_JWKS_INVALID";
var JWKSNoMatchingKey = class extends JOSEError {
  constructor(message2 = "no applicable key found in the JSON Web Key Set", options) {
    super(message2, options);
    this.code = "ERR_JWKS_NO_MATCHING_KEY";
  }
};
__name(JWKSNoMatchingKey, "JWKSNoMatchingKey");
JWKSNoMatchingKey.code = "ERR_JWKS_NO_MATCHING_KEY";
var JWKSMultipleMatchingKeys = class extends JOSEError {
  constructor(message2 = "multiple matching keys found in the JSON Web Key Set", options) {
    super(message2, options);
    this.code = "ERR_JWKS_MULTIPLE_MATCHING_KEYS";
  }
};
__name(JWKSMultipleMatchingKeys, "JWKSMultipleMatchingKeys");
JWKSMultipleMatchingKeys.code = "ERR_JWKS_MULTIPLE_MATCHING_KEYS";
var JWKSTimeout = class extends JOSEError {
  constructor(message2 = "request timed out", options) {
    super(message2, options);
    this.code = "ERR_JWKS_TIMEOUT";
  }
};
__name(JWKSTimeout, "JWKSTimeout");
JWKSTimeout.code = "ERR_JWKS_TIMEOUT";
var JWSSignatureVerificationFailed = class extends JOSEError {
  constructor(message2 = "signature verification failed", options) {
    super(message2, options);
    this.code = "ERR_JWS_SIGNATURE_VERIFICATION_FAILED";
  }
};
__name(JWSSignatureVerificationFailed, "JWSSignatureVerificationFailed");
JWSSignatureVerificationFailed.code = "ERR_JWS_SIGNATURE_VERIFICATION_FAILED";

// ../node_modules/jose/dist/browser/lib/crypto_key.js
function unusable(name, prop = "algorithm.name") {
  return new TypeError(`CryptoKey does not support this operation, its ${prop} must be ${name}`);
}
__name(unusable, "unusable");
function isAlgorithm(algorithm, name) {
  return algorithm.name === name;
}
__name(isAlgorithm, "isAlgorithm");
function getHashLength(hash) {
  return parseInt(hash.name.slice(4), 10);
}
__name(getHashLength, "getHashLength");
function getNamedCurve(alg) {
  switch (alg) {
    case "ES256":
      return "P-256";
    case "ES384":
      return "P-384";
    case "ES512":
      return "P-521";
    default:
      throw new Error("unreachable");
  }
}
__name(getNamedCurve, "getNamedCurve");
function checkUsage(key, usages) {
  if (usages.length && !usages.some((expected) => key.usages.includes(expected))) {
    let msg = "CryptoKey does not support this operation, its usages must include ";
    if (usages.length > 2) {
      const last = usages.pop();
      msg += `one of ${usages.join(", ")}, or ${last}.`;
    } else if (usages.length === 2) {
      msg += `one of ${usages[0]} or ${usages[1]}.`;
    } else {
      msg += `${usages[0]}.`;
    }
    throw new TypeError(msg);
  }
}
__name(checkUsage, "checkUsage");
function checkSigCryptoKey(key, alg, ...usages) {
  switch (alg) {
    case "HS256":
    case "HS384":
    case "HS512": {
      if (!isAlgorithm(key.algorithm, "HMAC"))
        throw unusable("HMAC");
      const expected = parseInt(alg.slice(2), 10);
      const actual = getHashLength(key.algorithm.hash);
      if (actual !== expected)
        throw unusable(`SHA-${expected}`, "algorithm.hash");
      break;
    }
    case "RS256":
    case "RS384":
    case "RS512": {
      if (!isAlgorithm(key.algorithm, "RSASSA-PKCS1-v1_5"))
        throw unusable("RSASSA-PKCS1-v1_5");
      const expected = parseInt(alg.slice(2), 10);
      const actual = getHashLength(key.algorithm.hash);
      if (actual !== expected)
        throw unusable(`SHA-${expected}`, "algorithm.hash");
      break;
    }
    case "PS256":
    case "PS384":
    case "PS512": {
      if (!isAlgorithm(key.algorithm, "RSA-PSS"))
        throw unusable("RSA-PSS");
      const expected = parseInt(alg.slice(2), 10);
      const actual = getHashLength(key.algorithm.hash);
      if (actual !== expected)
        throw unusable(`SHA-${expected}`, "algorithm.hash");
      break;
    }
    case "EdDSA": {
      if (key.algorithm.name !== "Ed25519" && key.algorithm.name !== "Ed448") {
        throw unusable("Ed25519 or Ed448");
      }
      break;
    }
    case "Ed25519": {
      if (!isAlgorithm(key.algorithm, "Ed25519"))
        throw unusable("Ed25519");
      break;
    }
    case "ES256":
    case "ES384":
    case "ES512": {
      if (!isAlgorithm(key.algorithm, "ECDSA"))
        throw unusable("ECDSA");
      const expected = getNamedCurve(alg);
      const actual = key.algorithm.namedCurve;
      if (actual !== expected)
        throw unusable(expected, "algorithm.namedCurve");
      break;
    }
    default:
      throw new TypeError("CryptoKey does not support this operation");
  }
  checkUsage(key, usages);
}
__name(checkSigCryptoKey, "checkSigCryptoKey");

// ../node_modules/jose/dist/browser/lib/invalid_key_input.js
function message(msg, actual, ...types2) {
  types2 = types2.filter(Boolean);
  if (types2.length > 2) {
    const last = types2.pop();
    msg += `one of type ${types2.join(", ")}, or ${last}.`;
  } else if (types2.length === 2) {
    msg += `one of type ${types2[0]} or ${types2[1]}.`;
  } else {
    msg += `of type ${types2[0]}.`;
  }
  if (actual == null) {
    msg += ` Received ${actual}`;
  } else if (typeof actual === "function" && actual.name) {
    msg += ` Received function ${actual.name}`;
  } else if (typeof actual === "object" && actual != null) {
    if (actual.constructor?.name) {
      msg += ` Received an instance of ${actual.constructor.name}`;
    }
  }
  return msg;
}
__name(message, "message");
var invalid_key_input_default = /* @__PURE__ */ __name((actual, ...types2) => {
  return message("Key must be ", actual, ...types2);
}, "default");
function withAlg(alg, actual, ...types2) {
  return message(`Key for the ${alg} algorithm must be `, actual, ...types2);
}
__name(withAlg, "withAlg");

// ../node_modules/jose/dist/browser/runtime/is_key_like.js
var is_key_like_default = /* @__PURE__ */ __name((key) => {
  if (isCryptoKey(key)) {
    return true;
  }
  return key?.[Symbol.toStringTag] === "KeyObject";
}, "default");
var types = ["CryptoKey"];

// ../node_modules/jose/dist/browser/lib/is_disjoint.js
var isDisjoint = /* @__PURE__ */ __name((...headers) => {
  const sources = headers.filter(Boolean);
  if (sources.length === 0 || sources.length === 1) {
    return true;
  }
  let acc;
  for (const header of sources) {
    const parameters = Object.keys(header);
    if (!acc || acc.size === 0) {
      acc = new Set(parameters);
      continue;
    }
    for (const parameter of parameters) {
      if (acc.has(parameter)) {
        return false;
      }
      acc.add(parameter);
    }
  }
  return true;
}, "isDisjoint");
var is_disjoint_default = isDisjoint;

// ../node_modules/jose/dist/browser/lib/is_object.js
function isObjectLike(value) {
  return typeof value === "object" && value !== null;
}
__name(isObjectLike, "isObjectLike");
function isObject(input) {
  if (!isObjectLike(input) || Object.prototype.toString.call(input) !== "[object Object]") {
    return false;
  }
  if (Object.getPrototypeOf(input) === null) {
    return true;
  }
  let proto = input;
  while (Object.getPrototypeOf(proto) !== null) {
    proto = Object.getPrototypeOf(proto);
  }
  return Object.getPrototypeOf(input) === proto;
}
__name(isObject, "isObject");

// ../node_modules/jose/dist/browser/runtime/check_key_length.js
var check_key_length_default = /* @__PURE__ */ __name((alg, key) => {
  if (alg.startsWith("RS") || alg.startsWith("PS")) {
    const { modulusLength } = key.algorithm;
    if (typeof modulusLength !== "number" || modulusLength < 2048) {
      throw new TypeError(`${alg} requires key modulusLength to be 2048 bits or larger`);
    }
  }
}, "default");

// ../node_modules/jose/dist/browser/lib/is_jwk.js
function isJWK(key) {
  return isObject(key) && typeof key.kty === "string";
}
__name(isJWK, "isJWK");
function isPrivateJWK(key) {
  return key.kty !== "oct" && typeof key.d === "string";
}
__name(isPrivateJWK, "isPrivateJWK");
function isPublicJWK(key) {
  return key.kty !== "oct" && typeof key.d === "undefined";
}
__name(isPublicJWK, "isPublicJWK");
function isSecretJWK(key) {
  return isJWK(key) && key.kty === "oct" && typeof key.k === "string";
}
__name(isSecretJWK, "isSecretJWK");

// ../node_modules/jose/dist/browser/runtime/jwk_to_key.js
function subtleMapping(jwk) {
  let algorithm;
  let keyUsages;
  switch (jwk.kty) {
    case "RSA": {
      switch (jwk.alg) {
        case "PS256":
        case "PS384":
        case "PS512":
          algorithm = { name: "RSA-PSS", hash: `SHA-${jwk.alg.slice(-3)}` };
          keyUsages = jwk.d ? ["sign"] : ["verify"];
          break;
        case "RS256":
        case "RS384":
        case "RS512":
          algorithm = { name: "RSASSA-PKCS1-v1_5", hash: `SHA-${jwk.alg.slice(-3)}` };
          keyUsages = jwk.d ? ["sign"] : ["verify"];
          break;
        case "RSA-OAEP":
        case "RSA-OAEP-256":
        case "RSA-OAEP-384":
        case "RSA-OAEP-512":
          algorithm = {
            name: "RSA-OAEP",
            hash: `SHA-${parseInt(jwk.alg.slice(-3), 10) || 1}`
          };
          keyUsages = jwk.d ? ["decrypt", "unwrapKey"] : ["encrypt", "wrapKey"];
          break;
        default:
          throw new JOSENotSupported('Invalid or unsupported JWK "alg" (Algorithm) Parameter value');
      }
      break;
    }
    case "EC": {
      switch (jwk.alg) {
        case "ES256":
          algorithm = { name: "ECDSA", namedCurve: "P-256" };
          keyUsages = jwk.d ? ["sign"] : ["verify"];
          break;
        case "ES384":
          algorithm = { name: "ECDSA", namedCurve: "P-384" };
          keyUsages = jwk.d ? ["sign"] : ["verify"];
          break;
        case "ES512":
          algorithm = { name: "ECDSA", namedCurve: "P-521" };
          keyUsages = jwk.d ? ["sign"] : ["verify"];
          break;
        case "ECDH-ES":
        case "ECDH-ES+A128KW":
        case "ECDH-ES+A192KW":
        case "ECDH-ES+A256KW":
          algorithm = { name: "ECDH", namedCurve: jwk.crv };
          keyUsages = jwk.d ? ["deriveBits"] : [];
          break;
        default:
          throw new JOSENotSupported('Invalid or unsupported JWK "alg" (Algorithm) Parameter value');
      }
      break;
    }
    case "OKP": {
      switch (jwk.alg) {
        case "Ed25519":
          algorithm = { name: "Ed25519" };
          keyUsages = jwk.d ? ["sign"] : ["verify"];
          break;
        case "EdDSA":
          algorithm = { name: jwk.crv };
          keyUsages = jwk.d ? ["sign"] : ["verify"];
          break;
        case "ECDH-ES":
        case "ECDH-ES+A128KW":
        case "ECDH-ES+A192KW":
        case "ECDH-ES+A256KW":
          algorithm = { name: jwk.crv };
          keyUsages = jwk.d ? ["deriveBits"] : [];
          break;
        default:
          throw new JOSENotSupported('Invalid or unsupported JWK "alg" (Algorithm) Parameter value');
      }
      break;
    }
    default:
      throw new JOSENotSupported('Invalid or unsupported JWK "kty" (Key Type) Parameter value');
  }
  return { algorithm, keyUsages };
}
__name(subtleMapping, "subtleMapping");
var parse = /* @__PURE__ */ __name(async (jwk) => {
  if (!jwk.alg) {
    throw new TypeError('"alg" argument is required when "jwk.alg" is not present');
  }
  const { algorithm, keyUsages } = subtleMapping(jwk);
  const rest = [
    algorithm,
    jwk.ext ?? false,
    jwk.key_ops ?? keyUsages
  ];
  const keyData = { ...jwk };
  delete keyData.alg;
  delete keyData.use;
  return webcrypto_default.subtle.importKey("jwk", keyData, ...rest);
}, "parse");
var jwk_to_key_default = parse;

// ../node_modules/jose/dist/browser/runtime/normalize_key.js
var exportKeyValue = /* @__PURE__ */ __name((k) => decode(k), "exportKeyValue");
var privCache;
var pubCache;
var isKeyObject = /* @__PURE__ */ __name((key) => {
  return key?.[Symbol.toStringTag] === "KeyObject";
}, "isKeyObject");
var importAndCache = /* @__PURE__ */ __name(async (cache, key, jwk, alg, freeze = false) => {
  let cached = cache.get(key);
  if (cached?.[alg]) {
    return cached[alg];
  }
  const cryptoKey = await jwk_to_key_default({ ...jwk, alg });
  if (freeze)
    Object.freeze(key);
  if (!cached) {
    cache.set(key, { [alg]: cryptoKey });
  } else {
    cached[alg] = cryptoKey;
  }
  return cryptoKey;
}, "importAndCache");
var normalizePublicKey = /* @__PURE__ */ __name((key, alg) => {
  if (isKeyObject(key)) {
    let jwk = key.export({ format: "jwk" });
    delete jwk.d;
    delete jwk.dp;
    delete jwk.dq;
    delete jwk.p;
    delete jwk.q;
    delete jwk.qi;
    if (jwk.k) {
      return exportKeyValue(jwk.k);
    }
    pubCache || (pubCache = /* @__PURE__ */ new WeakMap());
    return importAndCache(pubCache, key, jwk, alg);
  }
  if (isJWK(key)) {
    if (key.k)
      return decode(key.k);
    pubCache || (pubCache = /* @__PURE__ */ new WeakMap());
    const cryptoKey = importAndCache(pubCache, key, key, alg, true);
    return cryptoKey;
  }
  return key;
}, "normalizePublicKey");
var normalizePrivateKey = /* @__PURE__ */ __name((key, alg) => {
  if (isKeyObject(key)) {
    let jwk = key.export({ format: "jwk" });
    if (jwk.k) {
      return exportKeyValue(jwk.k);
    }
    privCache || (privCache = /* @__PURE__ */ new WeakMap());
    return importAndCache(privCache, key, jwk, alg);
  }
  if (isJWK(key)) {
    if (key.k)
      return decode(key.k);
    privCache || (privCache = /* @__PURE__ */ new WeakMap());
    const cryptoKey = importAndCache(privCache, key, key, alg, true);
    return cryptoKey;
  }
  return key;
}, "normalizePrivateKey");
var normalize_key_default = { normalizePublicKey, normalizePrivateKey };

// ../node_modules/jose/dist/browser/key/import.js
async function importJWK(jwk, alg) {
  if (!isObject(jwk)) {
    throw new TypeError("JWK must be an object");
  }
  alg || (alg = jwk.alg);
  switch (jwk.kty) {
    case "oct":
      if (typeof jwk.k !== "string" || !jwk.k) {
        throw new TypeError('missing "k" (Key Value) Parameter value');
      }
      return decode(jwk.k);
    case "RSA":
      if ("oth" in jwk && jwk.oth !== void 0) {
        throw new JOSENotSupported('RSA JWK "oth" (Other Primes Info) Parameter value is not supported');
      }
    case "EC":
    case "OKP":
      return jwk_to_key_default({ ...jwk, alg });
    default:
      throw new JOSENotSupported('Unsupported "kty" (Key Type) Parameter value');
  }
}
__name(importJWK, "importJWK");

// ../node_modules/jose/dist/browser/lib/check_key_type.js
var tag = /* @__PURE__ */ __name((key) => key?.[Symbol.toStringTag], "tag");
var jwkMatchesOp = /* @__PURE__ */ __name((alg, key, usage) => {
  if (key.use !== void 0 && key.use !== "sig") {
    throw new TypeError("Invalid key for this operation, when present its use must be sig");
  }
  if (key.key_ops !== void 0 && key.key_ops.includes?.(usage) !== true) {
    throw new TypeError(`Invalid key for this operation, when present its key_ops must include ${usage}`);
  }
  if (key.alg !== void 0 && key.alg !== alg) {
    throw new TypeError(`Invalid key for this operation, when present its alg must be ${alg}`);
  }
  return true;
}, "jwkMatchesOp");
var symmetricTypeCheck = /* @__PURE__ */ __name((alg, key, usage, allowJwk) => {
  if (key instanceof Uint8Array)
    return;
  if (allowJwk && isJWK(key)) {
    if (isSecretJWK(key) && jwkMatchesOp(alg, key, usage))
      return;
    throw new TypeError(`JSON Web Key for symmetric algorithms must have JWK "kty" (Key Type) equal to "oct" and the JWK "k" (Key Value) present`);
  }
  if (!is_key_like_default(key)) {
    throw new TypeError(withAlg(alg, key, ...types, "Uint8Array", allowJwk ? "JSON Web Key" : null));
  }
  if (key.type !== "secret") {
    throw new TypeError(`${tag(key)} instances for symmetric algorithms must be of type "secret"`);
  }
}, "symmetricTypeCheck");
var asymmetricTypeCheck = /* @__PURE__ */ __name((alg, key, usage, allowJwk) => {
  if (allowJwk && isJWK(key)) {
    switch (usage) {
      case "sign":
        if (isPrivateJWK(key) && jwkMatchesOp(alg, key, usage))
          return;
        throw new TypeError(`JSON Web Key for this operation be a private JWK`);
      case "verify":
        if (isPublicJWK(key) && jwkMatchesOp(alg, key, usage))
          return;
        throw new TypeError(`JSON Web Key for this operation be a public JWK`);
    }
  }
  if (!is_key_like_default(key)) {
    throw new TypeError(withAlg(alg, key, ...types, allowJwk ? "JSON Web Key" : null));
  }
  if (key.type === "secret") {
    throw new TypeError(`${tag(key)} instances for asymmetric algorithms must not be of type "secret"`);
  }
  if (usage === "sign" && key.type === "public") {
    throw new TypeError(`${tag(key)} instances for asymmetric algorithm signing must be of type "private"`);
  }
  if (usage === "decrypt" && key.type === "public") {
    throw new TypeError(`${tag(key)} instances for asymmetric algorithm decryption must be of type "private"`);
  }
  if (key.algorithm && usage === "verify" && key.type === "private") {
    throw new TypeError(`${tag(key)} instances for asymmetric algorithm verifying must be of type "public"`);
  }
  if (key.algorithm && usage === "encrypt" && key.type === "private") {
    throw new TypeError(`${tag(key)} instances for asymmetric algorithm encryption must be of type "public"`);
  }
}, "asymmetricTypeCheck");
function checkKeyType(allowJwk, alg, key, usage) {
  const symmetric = alg.startsWith("HS") || alg === "dir" || alg.startsWith("PBES2") || /^A\d{3}(?:GCM)?KW$/.test(alg);
  if (symmetric) {
    symmetricTypeCheck(alg, key, usage, allowJwk);
  } else {
    asymmetricTypeCheck(alg, key, usage, allowJwk);
  }
}
__name(checkKeyType, "checkKeyType");
var check_key_type_default = checkKeyType.bind(void 0, false);
var checkKeyTypeWithJwk = checkKeyType.bind(void 0, true);

// ../node_modules/jose/dist/browser/lib/validate_crit.js
function validateCrit(Err, recognizedDefault, recognizedOption, protectedHeader, joseHeader) {
  if (joseHeader.crit !== void 0 && protectedHeader?.crit === void 0) {
    throw new Err('"crit" (Critical) Header Parameter MUST be integrity protected');
  }
  if (!protectedHeader || protectedHeader.crit === void 0) {
    return /* @__PURE__ */ new Set();
  }
  if (!Array.isArray(protectedHeader.crit) || protectedHeader.crit.length === 0 || protectedHeader.crit.some((input) => typeof input !== "string" || input.length === 0)) {
    throw new Err('"crit" (Critical) Header Parameter MUST be an array of non-empty strings when present');
  }
  let recognized;
  if (recognizedOption !== void 0) {
    recognized = new Map([...Object.entries(recognizedOption), ...recognizedDefault.entries()]);
  } else {
    recognized = recognizedDefault;
  }
  for (const parameter of protectedHeader.crit) {
    if (!recognized.has(parameter)) {
      throw new JOSENotSupported(`Extension Header Parameter "${parameter}" is not recognized`);
    }
    if (joseHeader[parameter] === void 0) {
      throw new Err(`Extension Header Parameter "${parameter}" is missing`);
    }
    if (recognized.get(parameter) && protectedHeader[parameter] === void 0) {
      throw new Err(`Extension Header Parameter "${parameter}" MUST be integrity protected`);
    }
  }
  return new Set(protectedHeader.crit);
}
__name(validateCrit, "validateCrit");
var validate_crit_default = validateCrit;

// ../node_modules/jose/dist/browser/lib/validate_algorithms.js
var validateAlgorithms = /* @__PURE__ */ __name((option, algorithms) => {
  if (algorithms !== void 0 && (!Array.isArray(algorithms) || algorithms.some((s) => typeof s !== "string"))) {
    throw new TypeError(`"${option}" option must be an array of strings`);
  }
  if (!algorithms) {
    return void 0;
  }
  return new Set(algorithms);
}, "validateAlgorithms");
var validate_algorithms_default = validateAlgorithms;

// ../node_modules/jose/dist/browser/runtime/subtle_dsa.js
function subtleDsa(alg, algorithm) {
  const hash = `SHA-${alg.slice(-3)}`;
  switch (alg) {
    case "HS256":
    case "HS384":
    case "HS512":
      return { hash, name: "HMAC" };
    case "PS256":
    case "PS384":
    case "PS512":
      return { hash, name: "RSA-PSS", saltLength: alg.slice(-3) >> 3 };
    case "RS256":
    case "RS384":
    case "RS512":
      return { hash, name: "RSASSA-PKCS1-v1_5" };
    case "ES256":
    case "ES384":
    case "ES512":
      return { hash, name: "ECDSA", namedCurve: algorithm.namedCurve };
    case "Ed25519":
      return { name: "Ed25519" };
    case "EdDSA":
      return { name: algorithm.name };
    default:
      throw new JOSENotSupported(`alg ${alg} is not supported either by JOSE or your javascript runtime`);
  }
}
__name(subtleDsa, "subtleDsa");

// ../node_modules/jose/dist/browser/runtime/get_sign_verify_key.js
async function getCryptoKey(alg, key, usage) {
  if (usage === "sign") {
    key = await normalize_key_default.normalizePrivateKey(key, alg);
  }
  if (usage === "verify") {
    key = await normalize_key_default.normalizePublicKey(key, alg);
  }
  if (isCryptoKey(key)) {
    checkSigCryptoKey(key, alg, usage);
    return key;
  }
  if (key instanceof Uint8Array) {
    if (!alg.startsWith("HS")) {
      throw new TypeError(invalid_key_input_default(key, ...types));
    }
    return webcrypto_default.subtle.importKey("raw", key, { hash: `SHA-${alg.slice(-3)}`, name: "HMAC" }, false, [usage]);
  }
  throw new TypeError(invalid_key_input_default(key, ...types, "Uint8Array", "JSON Web Key"));
}
__name(getCryptoKey, "getCryptoKey");

// ../node_modules/jose/dist/browser/runtime/verify.js
var verify = /* @__PURE__ */ __name(async (alg, key, signature, data) => {
  const cryptoKey = await getCryptoKey(alg, key, "verify");
  check_key_length_default(alg, cryptoKey);
  const algorithm = subtleDsa(alg, cryptoKey.algorithm);
  try {
    return await webcrypto_default.subtle.verify(algorithm, cryptoKey, signature, data);
  } catch {
    return false;
  }
}, "verify");
var verify_default = verify;

// ../node_modules/jose/dist/browser/jws/flattened/verify.js
async function flattenedVerify(jws, key, options) {
  if (!isObject(jws)) {
    throw new JWSInvalid("Flattened JWS must be an object");
  }
  if (jws.protected === void 0 && jws.header === void 0) {
    throw new JWSInvalid('Flattened JWS must have either of the "protected" or "header" members');
  }
  if (jws.protected !== void 0 && typeof jws.protected !== "string") {
    throw new JWSInvalid("JWS Protected Header incorrect type");
  }
  if (jws.payload === void 0) {
    throw new JWSInvalid("JWS Payload missing");
  }
  if (typeof jws.signature !== "string") {
    throw new JWSInvalid("JWS Signature missing or incorrect type");
  }
  if (jws.header !== void 0 && !isObject(jws.header)) {
    throw new JWSInvalid("JWS Unprotected Header incorrect type");
  }
  let parsedProt = {};
  if (jws.protected) {
    try {
      const protectedHeader = decode(jws.protected);
      parsedProt = JSON.parse(decoder.decode(protectedHeader));
    } catch {
      throw new JWSInvalid("JWS Protected Header is invalid");
    }
  }
  if (!is_disjoint_default(parsedProt, jws.header)) {
    throw new JWSInvalid("JWS Protected and JWS Unprotected Header Parameter names must be disjoint");
  }
  const joseHeader = {
    ...parsedProt,
    ...jws.header
  };
  const extensions = validate_crit_default(JWSInvalid, /* @__PURE__ */ new Map([["b64", true]]), options?.crit, parsedProt, joseHeader);
  let b64 = true;
  if (extensions.has("b64")) {
    b64 = parsedProt.b64;
    if (typeof b64 !== "boolean") {
      throw new JWSInvalid('The "b64" (base64url-encode payload) Header Parameter must be a boolean');
    }
  }
  const { alg } = joseHeader;
  if (typeof alg !== "string" || !alg) {
    throw new JWSInvalid('JWS "alg" (Algorithm) Header Parameter missing or invalid');
  }
  const algorithms = options && validate_algorithms_default("algorithms", options.algorithms);
  if (algorithms && !algorithms.has(alg)) {
    throw new JOSEAlgNotAllowed('"alg" (Algorithm) Header Parameter value not allowed');
  }
  if (b64) {
    if (typeof jws.payload !== "string") {
      throw new JWSInvalid("JWS Payload must be a string");
    }
  } else if (typeof jws.payload !== "string" && !(jws.payload instanceof Uint8Array)) {
    throw new JWSInvalid("JWS Payload must be a string or an Uint8Array instance");
  }
  let resolvedKey = false;
  if (typeof key === "function") {
    key = await key(parsedProt, jws);
    resolvedKey = true;
    checkKeyTypeWithJwk(alg, key, "verify");
    if (isJWK(key)) {
      key = await importJWK(key, alg);
    }
  } else {
    checkKeyTypeWithJwk(alg, key, "verify");
  }
  const data = concat(encoder.encode(jws.protected ?? ""), encoder.encode("."), typeof jws.payload === "string" ? encoder.encode(jws.payload) : jws.payload);
  let signature;
  try {
    signature = decode(jws.signature);
  } catch {
    throw new JWSInvalid("Failed to base64url decode the signature");
  }
  const verified = await verify_default(alg, key, signature, data);
  if (!verified) {
    throw new JWSSignatureVerificationFailed();
  }
  let payload;
  if (b64) {
    try {
      payload = decode(jws.payload);
    } catch {
      throw new JWSInvalid("Failed to base64url decode the payload");
    }
  } else if (typeof jws.payload === "string") {
    payload = encoder.encode(jws.payload);
  } else {
    payload = jws.payload;
  }
  const result = { payload };
  if (jws.protected !== void 0) {
    result.protectedHeader = parsedProt;
  }
  if (jws.header !== void 0) {
    result.unprotectedHeader = jws.header;
  }
  if (resolvedKey) {
    return { ...result, key };
  }
  return result;
}
__name(flattenedVerify, "flattenedVerify");

// ../node_modules/jose/dist/browser/jws/compact/verify.js
async function compactVerify(jws, key, options) {
  if (jws instanceof Uint8Array) {
    jws = decoder.decode(jws);
  }
  if (typeof jws !== "string") {
    throw new JWSInvalid("Compact JWS must be a string or Uint8Array");
  }
  const { 0: protectedHeader, 1: payload, 2: signature, length } = jws.split(".");
  if (length !== 3) {
    throw new JWSInvalid("Invalid Compact JWS");
  }
  const verified = await flattenedVerify({ payload, protected: protectedHeader, signature }, key, options);
  const result = { payload: verified.payload, protectedHeader: verified.protectedHeader };
  if (typeof key === "function") {
    return { ...result, key: verified.key };
  }
  return result;
}
__name(compactVerify, "compactVerify");

// ../node_modules/jose/dist/browser/lib/epoch.js
var epoch_default = /* @__PURE__ */ __name((date) => Math.floor(date.getTime() / 1e3), "default");

// ../node_modules/jose/dist/browser/lib/secs.js
var minute = 60;
var hour = minute * 60;
var day = hour * 24;
var week = day * 7;
var year = day * 365.25;
var REGEX = /^(\+|\-)? ?(\d+|\d+\.\d+) ?(seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)(?: (ago|from now))?$/i;
var secs_default = /* @__PURE__ */ __name((str) => {
  const matched = REGEX.exec(str);
  if (!matched || matched[4] && matched[1]) {
    throw new TypeError("Invalid time period format");
  }
  const value = parseFloat(matched[2]);
  const unit = matched[3].toLowerCase();
  let numericDate;
  switch (unit) {
    case "sec":
    case "secs":
    case "second":
    case "seconds":
    case "s":
      numericDate = Math.round(value);
      break;
    case "minute":
    case "minutes":
    case "min":
    case "mins":
    case "m":
      numericDate = Math.round(value * minute);
      break;
    case "hour":
    case "hours":
    case "hr":
    case "hrs":
    case "h":
      numericDate = Math.round(value * hour);
      break;
    case "day":
    case "days":
    case "d":
      numericDate = Math.round(value * day);
      break;
    case "week":
    case "weeks":
    case "w":
      numericDate = Math.round(value * week);
      break;
    default:
      numericDate = Math.round(value * year);
      break;
  }
  if (matched[1] === "-" || matched[4] === "ago") {
    return -numericDate;
  }
  return numericDate;
}, "default");

// ../node_modules/jose/dist/browser/lib/jwt_claims_set.js
var normalizeTyp = /* @__PURE__ */ __name((value) => value.toLowerCase().replace(/^application\//, ""), "normalizeTyp");
var checkAudiencePresence = /* @__PURE__ */ __name((audPayload, audOption) => {
  if (typeof audPayload === "string") {
    return audOption.includes(audPayload);
  }
  if (Array.isArray(audPayload)) {
    return audOption.some(Set.prototype.has.bind(new Set(audPayload)));
  }
  return false;
}, "checkAudiencePresence");
var jwt_claims_set_default = /* @__PURE__ */ __name((protectedHeader, encodedPayload, options = {}) => {
  let payload;
  try {
    payload = JSON.parse(decoder.decode(encodedPayload));
  } catch {
  }
  if (!isObject(payload)) {
    throw new JWTInvalid("JWT Claims Set must be a top-level JSON object");
  }
  const { typ } = options;
  if (typ && (typeof protectedHeader.typ !== "string" || normalizeTyp(protectedHeader.typ) !== normalizeTyp(typ))) {
    throw new JWTClaimValidationFailed('unexpected "typ" JWT header value', payload, "typ", "check_failed");
  }
  const { requiredClaims = [], issuer, subject, audience, maxTokenAge } = options;
  const presenceCheck = [...requiredClaims];
  if (maxTokenAge !== void 0)
    presenceCheck.push("iat");
  if (audience !== void 0)
    presenceCheck.push("aud");
  if (subject !== void 0)
    presenceCheck.push("sub");
  if (issuer !== void 0)
    presenceCheck.push("iss");
  for (const claim of new Set(presenceCheck.reverse())) {
    if (!(claim in payload)) {
      throw new JWTClaimValidationFailed(`missing required "${claim}" claim`, payload, claim, "missing");
    }
  }
  if (issuer && !(Array.isArray(issuer) ? issuer : [issuer]).includes(payload.iss)) {
    throw new JWTClaimValidationFailed('unexpected "iss" claim value', payload, "iss", "check_failed");
  }
  if (subject && payload.sub !== subject) {
    throw new JWTClaimValidationFailed('unexpected "sub" claim value', payload, "sub", "check_failed");
  }
  if (audience && !checkAudiencePresence(payload.aud, typeof audience === "string" ? [audience] : audience)) {
    throw new JWTClaimValidationFailed('unexpected "aud" claim value', payload, "aud", "check_failed");
  }
  let tolerance;
  switch (typeof options.clockTolerance) {
    case "string":
      tolerance = secs_default(options.clockTolerance);
      break;
    case "number":
      tolerance = options.clockTolerance;
      break;
    case "undefined":
      tolerance = 0;
      break;
    default:
      throw new TypeError("Invalid clockTolerance option type");
  }
  const { currentDate } = options;
  const now2 = epoch_default(currentDate || /* @__PURE__ */ new Date());
  if ((payload.iat !== void 0 || maxTokenAge) && typeof payload.iat !== "number") {
    throw new JWTClaimValidationFailed('"iat" claim must be a number', payload, "iat", "invalid");
  }
  if (payload.nbf !== void 0) {
    if (typeof payload.nbf !== "number") {
      throw new JWTClaimValidationFailed('"nbf" claim must be a number', payload, "nbf", "invalid");
    }
    if (payload.nbf > now2 + tolerance) {
      throw new JWTClaimValidationFailed('"nbf" claim timestamp check failed', payload, "nbf", "check_failed");
    }
  }
  if (payload.exp !== void 0) {
    if (typeof payload.exp !== "number") {
      throw new JWTClaimValidationFailed('"exp" claim must be a number', payload, "exp", "invalid");
    }
    if (payload.exp <= now2 - tolerance) {
      throw new JWTExpired('"exp" claim timestamp check failed', payload, "exp", "check_failed");
    }
  }
  if (maxTokenAge) {
    const age = now2 - payload.iat;
    const max = typeof maxTokenAge === "number" ? maxTokenAge : secs_default(maxTokenAge);
    if (age - tolerance > max) {
      throw new JWTExpired('"iat" claim timestamp check failed (too far in the past)', payload, "iat", "check_failed");
    }
    if (age < 0 - tolerance) {
      throw new JWTClaimValidationFailed('"iat" claim timestamp check failed (it should be in the past)', payload, "iat", "check_failed");
    }
  }
  return payload;
}, "default");

// ../node_modules/jose/dist/browser/jwt/verify.js
async function jwtVerify(jwt, key, options) {
  const verified = await compactVerify(jwt, key, options);
  if (verified.protectedHeader.crit?.includes("b64") && verified.protectedHeader.b64 === false) {
    throw new JWTInvalid("JWTs MUST NOT use unencoded payload");
  }
  const payload = jwt_claims_set_default(verified.protectedHeader, verified.payload, options);
  const result = { payload, protectedHeader: verified.protectedHeader };
  if (typeof key === "function") {
    return { ...result, key: verified.key };
  }
  return result;
}
__name(jwtVerify, "jwtVerify");

// ../node_modules/jose/dist/browser/runtime/sign.js
var sign = /* @__PURE__ */ __name(async (alg, key, data) => {
  const cryptoKey = await getCryptoKey(alg, key, "sign");
  check_key_length_default(alg, cryptoKey);
  const signature = await webcrypto_default.subtle.sign(subtleDsa(alg, cryptoKey.algorithm), cryptoKey, data);
  return new Uint8Array(signature);
}, "sign");
var sign_default = sign;

// ../node_modules/jose/dist/browser/jws/flattened/sign.js
var FlattenedSign = class {
  constructor(payload) {
    if (!(payload instanceof Uint8Array)) {
      throw new TypeError("payload must be an instance of Uint8Array");
    }
    this._payload = payload;
  }
  setProtectedHeader(protectedHeader) {
    if (this._protectedHeader) {
      throw new TypeError("setProtectedHeader can only be called once");
    }
    this._protectedHeader = protectedHeader;
    return this;
  }
  setUnprotectedHeader(unprotectedHeader) {
    if (this._unprotectedHeader) {
      throw new TypeError("setUnprotectedHeader can only be called once");
    }
    this._unprotectedHeader = unprotectedHeader;
    return this;
  }
  async sign(key, options) {
    if (!this._protectedHeader && !this._unprotectedHeader) {
      throw new JWSInvalid("either setProtectedHeader or setUnprotectedHeader must be called before #sign()");
    }
    if (!is_disjoint_default(this._protectedHeader, this._unprotectedHeader)) {
      throw new JWSInvalid("JWS Protected and JWS Unprotected Header Parameter names must be disjoint");
    }
    const joseHeader = {
      ...this._protectedHeader,
      ...this._unprotectedHeader
    };
    const extensions = validate_crit_default(JWSInvalid, /* @__PURE__ */ new Map([["b64", true]]), options?.crit, this._protectedHeader, joseHeader);
    let b64 = true;
    if (extensions.has("b64")) {
      b64 = this._protectedHeader.b64;
      if (typeof b64 !== "boolean") {
        throw new JWSInvalid('The "b64" (base64url-encode payload) Header Parameter must be a boolean');
      }
    }
    const { alg } = joseHeader;
    if (typeof alg !== "string" || !alg) {
      throw new JWSInvalid('JWS "alg" (Algorithm) Header Parameter missing or invalid');
    }
    checkKeyTypeWithJwk(alg, key, "sign");
    let payload = this._payload;
    if (b64) {
      payload = encoder.encode(encode(payload));
    }
    let protectedHeader;
    if (this._protectedHeader) {
      protectedHeader = encoder.encode(encode(JSON.stringify(this._protectedHeader)));
    } else {
      protectedHeader = encoder.encode("");
    }
    const data = concat(protectedHeader, encoder.encode("."), payload);
    const signature = await sign_default(alg, key, data);
    const jws = {
      signature: encode(signature),
      payload: ""
    };
    if (b64) {
      jws.payload = decoder.decode(payload);
    }
    if (this._unprotectedHeader) {
      jws.header = this._unprotectedHeader;
    }
    if (this._protectedHeader) {
      jws.protected = decoder.decode(protectedHeader);
    }
    return jws;
  }
};
__name(FlattenedSign, "FlattenedSign");

// ../node_modules/jose/dist/browser/jws/compact/sign.js
var CompactSign = class {
  constructor(payload) {
    this._flattened = new FlattenedSign(payload);
  }
  setProtectedHeader(protectedHeader) {
    this._flattened.setProtectedHeader(protectedHeader);
    return this;
  }
  async sign(key, options) {
    const jws = await this._flattened.sign(key, options);
    if (jws.payload === void 0) {
      throw new TypeError("use the flattened module for creating JWS with b64: false");
    }
    return `${jws.protected}.${jws.payload}.${jws.signature}`;
  }
};
__name(CompactSign, "CompactSign");

// ../node_modules/jose/dist/browser/jwt/produce.js
function validateInput(label, input) {
  if (!Number.isFinite(input)) {
    throw new TypeError(`Invalid ${label} input`);
  }
  return input;
}
__name(validateInput, "validateInput");
var ProduceJWT = class {
  constructor(payload = {}) {
    if (!isObject(payload)) {
      throw new TypeError("JWT Claims Set MUST be an object");
    }
    this._payload = payload;
  }
  setIssuer(issuer) {
    this._payload = { ...this._payload, iss: issuer };
    return this;
  }
  setSubject(subject) {
    this._payload = { ...this._payload, sub: subject };
    return this;
  }
  setAudience(audience) {
    this._payload = { ...this._payload, aud: audience };
    return this;
  }
  setJti(jwtId) {
    this._payload = { ...this._payload, jti: jwtId };
    return this;
  }
  setNotBefore(input) {
    if (typeof input === "number") {
      this._payload = { ...this._payload, nbf: validateInput("setNotBefore", input) };
    } else if (input instanceof Date) {
      this._payload = { ...this._payload, nbf: validateInput("setNotBefore", epoch_default(input)) };
    } else {
      this._payload = { ...this._payload, nbf: epoch_default(/* @__PURE__ */ new Date()) + secs_default(input) };
    }
    return this;
  }
  setExpirationTime(input) {
    if (typeof input === "number") {
      this._payload = { ...this._payload, exp: validateInput("setExpirationTime", input) };
    } else if (input instanceof Date) {
      this._payload = { ...this._payload, exp: validateInput("setExpirationTime", epoch_default(input)) };
    } else {
      this._payload = { ...this._payload, exp: epoch_default(/* @__PURE__ */ new Date()) + secs_default(input) };
    }
    return this;
  }
  setIssuedAt(input) {
    if (typeof input === "undefined") {
      this._payload = { ...this._payload, iat: epoch_default(/* @__PURE__ */ new Date()) };
    } else if (input instanceof Date) {
      this._payload = { ...this._payload, iat: validateInput("setIssuedAt", epoch_default(input)) };
    } else if (typeof input === "string") {
      this._payload = {
        ...this._payload,
        iat: validateInput("setIssuedAt", epoch_default(/* @__PURE__ */ new Date()) + secs_default(input))
      };
    } else {
      this._payload = { ...this._payload, iat: validateInput("setIssuedAt", input) };
    }
    return this;
  }
};
__name(ProduceJWT, "ProduceJWT");

// ../node_modules/jose/dist/browser/jwt/sign.js
var SignJWT = class extends ProduceJWT {
  setProtectedHeader(protectedHeader) {
    this._protectedHeader = protectedHeader;
    return this;
  }
  async sign(key, options) {
    const sig = new CompactSign(encoder.encode(JSON.stringify(this._payload)));
    sig.setProtectedHeader(this._protectedHeader);
    if (Array.isArray(this._protectedHeader?.crit) && this._protectedHeader.crit.includes("b64") && this._protectedHeader.b64 === false) {
      throw new JWTInvalid("JWTs MUST NOT use unencoded payload");
    }
    return sig.sign(key, options);
  }
};
__name(SignJWT, "SignJWT");

// src/auth.js
var encoder2 = new TextEncoder();
function secretKey(env) {
  return encoder2.encode(env.JWT_SECRET || "zongce_jwt_secret_2024_prod");
}
__name(secretKey, "secretKey");
function verifyPassword(password, hash) {
  return import_bcryptjs.default.compareSync(password, hash);
}
__name(verifyPassword, "verifyPassword");
async function signToken(env, user) {
  return new SignJWT({ id: user.id, role: user.role, account: user.account, name: user.name }).setProtectedHeader({ alg: "HS256" }).setExpirationTime("7d").sign(secretKey(env));
}
__name(signToken, "signToken");
async function getUserFromRequest(request, env) {
  const header = request.headers.get("Authorization") || "";
  if (!header.startsWith("Bearer "))
    return null;
  try {
    const { payload } = await jwtVerify(header.slice(7), secretKey(env));
    return payload;
  } catch {
    return null;
  }
}
__name(getUserFromRequest, "getUserFromRequest");

// src/rbac.js
var PERMISSION_DEFS = [
  { key: "application:read", group: "\u7EFC\u6D4B\u7533\u8BF7", label: "\u67E5\u770B\u52A0\u5206\u7533\u8BF7" },
  { key: "application:review", group: "\u7EFC\u6D4B\u7533\u8BF7", label: "\u5BA1\u6838\u52A0\u5206\u7533\u8BF7" },
  { key: "class:read", group: "\u73ED\u7EA7", label: "\u67E5\u770B\u73ED\u7EA7" },
  { key: "class:write", group: "\u73ED\u7EA7", label: "\u7BA1\u7406\u73ED\u7EA7\uFF08\u589E\u5220\u6539\uFF09" },
  { key: "student:read", group: "\u5B66\u751F", label: "\u67E5\u770B\u5B66\u751F\u4FE1\u606F" },
  { key: "student:write", group: "\u5B66\u751F", label: "\u7BA1\u7406\u5B66\u751F\u4FE1\u606F\u4E0E\u6210\u7EE9" },
  { key: "attendance:read", group: "\u8003\u52E4", label: "\u67E5\u770B\u8003\u52E4" },
  { key: "attendance:write", group: "\u8003\u52E4", label: "\u767B\u8BB0 / \u4FEE\u6539\u8003\u52E4" },
  { key: "teacher:read", group: "\u6559\u5E08", label: "\u67E5\u770B\u6559\u5E08\u4FE1\u606F" },
  { key: "teacher:write", group: "\u6559\u5E08", label: "\u7BA1\u7406\u6559\u5E08\u8D26\u53F7" },
  { key: "user:manage", group: "\u8D26\u53F7", label: "\u7BA1\u7406\u8D26\u53F7\uFF08\u65B0\u589E / \u505C\u7528\uFF09" },
  { key: "permission:manage", group: "\u7CFB\u7EDF", label: "\u7BA1\u7406\u89D2\u8272\u6743\u9650" }
];
var PERMISSION_KEYS = PERMISSION_DEFS.map((p) => p.key);
var ROLE_LABELS = {
  student: "\u5B66\u751F",
  teacher: "\u8F85\u5BFC\u5458 / \u6559\u5E08",
  admin: "\u8D85\u7EA7\u7BA1\u7406\u5458"
};
var ROLE_DEFAULTS = {
  student: ["application:read"],
  teacher: [
    "application:read",
    "application:review",
    "class:read",
    "class:write",
    "student:read",
    "student:write",
    "attendance:read",
    "attendance:write"
  ],
  admin: [...PERMISSION_KEYS]
};
async function loadPermissions(db, user) {
  const perms = new Set(ROLE_DEFAULTS[user.role] || []);
  const roleRows = await db.query("SELECT permission_key, granted FROM role_permissions WHERE role = ?", [user.role]);
  for (const r of roleRows) {
    if (r.granted)
      perms.add(r.permission_key);
    else
      perms.delete(r.permission_key);
  }
  const userRows = await db.query("SELECT permission_key, granted FROM user_permissions WHERE user_id = ?", [user.id]);
  for (const r of userRows) {
    if (r.granted)
      perms.add(r.permission_key);
    else
      perms.delete(r.permission_key);
  }
  if (user.role === "admin")
    perms.add("permission:manage");
  return perms;
}
__name(loadPermissions, "loadPermissions");
function can(ctx, key) {
  return !!ctx.perms && ctx.perms.has(key);
}
__name(can, "can");
function requirePerm(ctx, key) {
  return can(ctx, key) ? null : fail("\u65E0\u6743\u9650\u6267\u884C\u8BE5\u64CD\u4F5C", 403, ctx.env);
}
__name(requirePerm, "requirePerm");
async function applyPermissionOverrides(db, user, selectedKeys) {
  const selected = new Set(selectedKeys || []);
  const inherited = new Set(ROLE_DEFAULTS[user.role] || []);
  const roleRows = await db.query("SELECT permission_key, granted FROM role_permissions WHERE role = ?", [user.role]);
  for (const r of roleRows) {
    if (r.granted)
      inherited.add(r.permission_key);
    else
      inherited.delete(r.permission_key);
  }
  await db.run("DELETE FROM user_permissions WHERE user_id = ?", [user.id]);
  for (const key of PERMISSION_KEYS) {
    const want = selected.has(key);
    if (want !== inherited.has(key)) {
      await db.run("INSERT INTO user_permissions (user_id, permission_key, granted) VALUES (?, ?, ?)", [user.id, key, want ? 1 : 0]);
    }
  }
}
__name(applyPermissionOverrides, "applyPermissionOverrides");

// src/routes/auth.js
async function handleLogin(method, ctx) {
  if (method !== "POST")
    return null;
  const { request, env, db } = ctx;
  const { account, password } = await request.json();
  if (!account || !password)
    return fail("\u8BF7\u8F93\u5165\u8D26\u53F7\u548C\u5BC6\u7801", 400, env);
  const user = await db.queryOne("SELECT * FROM users WHERE account = ?", [account]);
  if (!user)
    return fail("\u8D26\u53F7\u4E0D\u5B58\u5728", 400, env);
  if (!verifyPassword(password, user.password_hash))
    return fail("\u5BC6\u7801\u9519\u8BEF", 400, env);
  if (Number(user.status) === 0)
    return fail("\u8D26\u53F7\u5DF2\u505C\u7528\uFF0C\u8BF7\u8054\u7CFB\u7BA1\u7406\u5458", 403, env);
  const token = await signToken(env, user);
  const permissions = [...await loadPermissions(db, user)];
  let extra = {};
  if (user.role === "student") {
    const stu = await db.queryOne("SELECT bj, zhuanye FROM students WHERE xh = ?", [user.account]);
    if (stu)
      extra = { bj: stu.bj, zhuanye: stu.zhuanye };
  }
  return ok({ token, role: user.role, name: user.name, account: user.account, permissions, ...extra }, env);
}
__name(handleLogin, "handleLogin");

// src/calc.js
function sum(arr) {
  return Array.isArray(arr) ? arr.reduce((s, v) => s + Number(v || 0), 0) : 0;
}
__name(sum, "sum");
function cap(v, max = Infinity) {
  return Math.max(0, Math.min(Number(v || 0), max));
}
__name(cap, "cap");
function calcScores(detail) {
  const deyu = detail.deyu || {};
  const zhiyu = detail.zhiyu || {};
  const tiyu = detail.tiyu || {};
  const meiyu = detail.meiyu || {};
  const laoyu = detail.laoyu || {};
  const koufen = detail.koufen || {};
  const deyuJL = (Number(deyu.sixiang) || 0) + (Number(deyu.biaozhang) || 0) + Math.min(sum(deyu.ganbu), 10) + Math.min(sum(deyu.rongyu), 10);
  const deyuScore = Math.min(80 + cap(deyuJL), 100);
  const zhiyuReward = cap((Number(zhiyu.jingsai) || 0) + Math.min(sum(zhiyu.jineng), 20) + (Number(zhiyu.chuangye) || 0));
  const tiyuReward = cap(Number(tiyu.jiangli) || 0);
  const meiyuReward = cap(Number(meiyu.jiangli) || 0);
  const laoyuReward = cap(Math.min(Number(laoyu.zhiyuanCishu) || 0, 10) + (Number(laoyu.xianxue) || 0) * 5 + (Number(laoyu.shehui) || 0));
  const koufenVal = -(Number(koufen.chufen) || 0);
  return { deyuScore, zhiyuReward, tiyuReward, meiyuReward, laoyuReward, koufenVal };
}
__name(calcScores, "calcScores");
var SCORE_FIELDS = [
  { item: "deyu_score", column: "deyu_sixiang" },
  { item: "zhiyu_reward", column: "zhiyu_jingsai" },
  { item: "tiyu_reward", column: "tiyu_jiangli" },
  { item: "meiyu_reward", column: "meiyu_jiangli" },
  { item: "laoyu_reward", column: "laoyu_shehui" }
];

// src/routes/student.js
var LIST_PATH = "/api/student/applications";
var DETAIL_RE = /^\/api\/student\/applications\/(\d+)$/;
async function handleStudent(path, method, ctx) {
  const { request, env, db, user } = ctx;
  if (path === LIST_PATH && method === "GET") {
    const stu = await db.queryOne("SELECT id FROM students WHERE xh = ?", [user.account]);
    if (!stu)
      return ok([], env);
    const apps = await db.query(
      `SELECT a.*, (SELECT COUNT(*) FROM proofs WHERE application_id = a.id) AS proof_count
       FROM applications a WHERE a.student_id = ? ORDER BY a.created_at DESC`,
      [stu.id]
    );
    return ok(apps, env);
  }
  if (path === LIST_PATH && method === "POST") {
    const detail = await request.json();
    if (!detail.xh || !detail.xm)
      return fail("\u5B66\u53F7\u548C\u59D3\u540D\u5FC5\u586B", 400, env);
    const stu = await db.queryOne("SELECT id FROM students WHERE xh = ?", [detail.xh]);
    if (!stu)
      return fail("\u5B66\u751F\u6863\u6848\u4E0D\u5B58\u5728\uFF0C\u8BF7\u8054\u7CFB\u8F85\u5BFC\u5458", 400, env);
    if (user.account !== detail.xh)
      return fail("\u53EA\u80FD\u63D0\u4EA4\u672C\u4EBA\u7684\u7533\u8BF7", 403, env);
    const scores = calcScores(detail);
    const createdAt = now();
    const app = await db.insert(
      "INSERT INTO applications (student_id, status, created_at) VALUES (?, ?, ?)",
      [stu.id, "pending", createdAt]
    );
    await db.insert(
      `INSERT INTO application_items
        (application_id, detail, deyu_score, zhiyu_reward, tiyu_reward, meiyu_reward, laoyu_reward, koufen)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        app.insertId,
        JSON.stringify(detail),
        scores.deyuScore,
        scores.zhiyuReward,
        scores.tiyuReward,
        scores.meiyuReward,
        scores.laoyuReward,
        scores.koufenVal
      ]
    );
    return ok({ id: app.insertId }, env);
  }
  const m = path.match(DETAIL_RE);
  if (m && method === "GET") {
    const stu = await db.queryOne("SELECT id FROM students WHERE xh = ?", [user.account]);
    if (!stu)
      return fail("\u5B66\u751F\u6863\u6848\u4E0D\u5B58\u5728", 400, env);
    const app = await db.queryOne("SELECT * FROM applications WHERE id = ? AND student_id = ?", [m[1], stu.id]);
    if (!app)
      return fail("\u7533\u8BF7\u4E0D\u5B58\u5728", 404, env);
    const item = await db.queryOne("SELECT * FROM application_items WHERE application_id = ?", [app.id]);
    const proofs = await db.query("SELECT * FROM proofs WHERE application_id = ?", [app.id]);
    return ok({
      ...app,
      detail: item ? JSON.parse(item.detail) : null,
      scores: item ? {
        deyu_score: item.deyu_score,
        zhiyu_reward: item.zhiyu_reward,
        tiyu_reward: item.tiyu_reward,
        meiyu_reward: item.meiyu_reward,
        laoyu_reward: item.laoyu_reward,
        koufen: item.koufen
      } : null,
      proofs: proofs.map((p) => ({ id: p.id, item_key: p.item_key, file_name: p.file_name, file_type: p.file_type, size: p.size }))
    }, env);
  }
  return null;
}
__name(handleStudent, "handleStudent");

// src/routes/teacher.js
var import_bcryptjs2 = __toESM(require_bcrypt());
var APPS_PATH = "/api/teacher/applications";
var APP_RE = /^\/api\/teacher\/applications\/(\d+)$/;
var REVIEW_RE = /^\/api\/teacher\/applications\/(\d+)\/review$/;
var STUDENTS_PATH = "/api/teacher/students";
var STUDENT_RE = /^\/api\/teacher\/students\/([^/]+)$/;
var CLASSES_PATH = "/api/teacher/classes";
var CLASS_RE = /^\/api\/teacher\/classes\/(\d+)$/;
var ATTENDANCE_PATH = "/api/teacher/attendance";
var ATTENDANCE_RE = /^\/api\/teacher\/attendance\/(\d+)$/;
var DEFAULT_STUDENT_PASSWORD = "123456";
var ATTENDANCE_STATUS = ["present", "late", "absent", "leave"];
var NUM_FIELDS = [
  "zhuanye_score",
  "tiyu_chengji",
  "tiyu_tice",
  "deyu_sixiang",
  "deyu_biaozhang",
  "deyu_custom",
  "zhiyu_jingsai",
  "zhiyu_chuangye",
  "zhiyu_custom",
  "tiyu_jiangli",
  "tiyu_custom",
  "meiyu_jiangli",
  "meiyu_custom",
  "laoyu_zhiyuanCishu",
  "laoyu_xianxue",
  "laoyu_qinshi",
  "laoyu_shehui",
  "laoyu_custom",
  "koufen_chufen",
  "koufen_richang"
];
var INFO_FIELDS = ["xm", "zhuanye", "bj"];
var JSON_FIELDS = ["deyu_ganbu", "deyu_rongyu", "zhiyu_jineng"];
function ownerScope(ctx, alias = "s") {
  if (ctx.user.role === "admin")
    return { sql: "", params: [] };
  return { sql: ` AND ${alias}.fdy = ?`, params: [ctx.user.account] };
}
__name(ownerScope, "ownerScope");
async function assertOwnClass(ctx, classId) {
  const cls = await ctx.db.queryOne("SELECT * FROM classes WHERE id = ?", [classId]);
  if (!cls)
    return { error: fail("\u73ED\u7EA7\u4E0D\u5B58\u5728", 404, ctx.env) };
  if (ctx.user.role !== "admin" && cls.teacher_account !== ctx.user.account) {
    return { error: fail("\u53EA\u80FD\u64CD\u4F5C\u81EA\u5DF1\u8D1F\u8D23\u7684\u73ED\u7EA7", 403, ctx.env) };
  }
  return { cls };
}
__name(assertOwnClass, "assertOwnClass");
async function assertOwnStudent(ctx, xh) {
  const stu = await ctx.db.queryOne("SELECT * FROM students WHERE xh = ?", [xh]);
  if (!stu)
    return { error: fail("\u5B66\u751F\u4E0D\u5B58\u5728", 404, ctx.env) };
  if (ctx.user.role !== "admin" && stu.fdy !== ctx.user.account) {
    return { error: fail("\u53EA\u80FD\u64CD\u4F5C\u81EA\u5DF1\u8D1F\u8D23\u7684\u5B66\u751F", 403, ctx.env) };
  }
  return { stu };
}
__name(assertOwnStudent, "assertOwnStudent");
function parseImportRows(csv) {
  return csv.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => line.split(/[,，\t]/).map((s) => s.trim())).filter((cols) => cols[0] && !/^学号/.test(cols[0]));
}
__name(parseImportRows, "parseImportRows");
async function handleTeacher(path, method, ctx) {
  const { request, env, db, searchParams } = ctx;
  if (path === CLASSES_PATH && method === "GET") {
    const denied = requirePerm(ctx, "class:read");
    if (denied)
      return denied;
    let sql = `SELECT c.*, (SELECT COUNT(*) FROM students s WHERE s.class_id = c.id) AS student_count
               FROM classes c WHERE 1=1`;
    const params = [];
    if (ctx.user.role !== "admin") {
      sql += " AND c.teacher_account = ?";
      params.push(ctx.user.account);
    }
    sql += " ORDER BY c.name";
    return ok(await db.query(sql, params), env);
  }
  if (path === CLASSES_PATH && method === "POST") {
    const denied = requirePerm(ctx, "class:write");
    if (denied)
      return denied;
    const d = await request.json();
    if (!d.name)
      return fail("\u73ED\u7EA7\u540D\u79F0\u4E0D\u80FD\u4E3A\u7A7A", 400, env);
    const teacherAccount = ctx.user.role === "admin" && d.teacher_account ? d.teacher_account : ctx.user.account;
    const exists = await db.queryOne("SELECT id FROM classes WHERE name = ?", [d.name]);
    if (exists)
      return fail("\u73ED\u7EA7\u5DF2\u5B58\u5728", 400, env);
    const r = await db.insert(
      "INSERT INTO classes (name, teacher_account, major, grade, created_at) VALUES (?, ?, ?, ?, ?)",
      [d.name, teacherAccount, d.major || "", d.grade || "", now()]
    );
    return ok({ id: r.insertId }, env);
  }
  const cm = path.match(CLASS_RE);
  if (cm && (method === "PUT" || method === "DELETE")) {
    const denied = requirePerm(ctx, "class:write");
    if (denied)
      return denied;
    const { cls, error } = await assertOwnClass(ctx, cm[1]);
    if (error)
      return error;
    if (method === "PUT") {
      const d = await request.json();
      const sets = [];
      const params = [];
      for (const f of ["name", "major", "grade"]) {
        if (d[f] !== void 0) {
          sets.push(f + " = ?");
          params.push(d[f]);
        }
      }
      if (d.teacher_account && ctx.user.role === "admin") {
        sets.push("teacher_account = ?");
        params.push(d.teacher_account);
      }
      if (sets.length === 0)
        return fail("\u65E0\u66F4\u65B0\u5B57\u6BB5", 400, env);
      params.push(cls.id);
      await db.update("UPDATE classes SET " + sets.join(", ") + " WHERE id = ?", params);
      if (d.name && d.name !== cls.name) {
        await db.update("UPDATE students SET bj = ? WHERE class_id = ?", [d.name, cls.id]);
      }
      return ok(null, env);
    }
    const used = await db.queryOne("SELECT COUNT(*) AS c FROM students WHERE class_id = ?", [cls.id]);
    if (used && used.c > 0)
      return fail("\u8BE5\u73ED\u7EA7\u4E0B\u8FD8\u6709\u5B66\u751F\uFF0C\u8BF7\u5148\u79FB\u9664\u6216\u8F6C\u73ED", 400, env);
    await db.run("DELETE FROM classes WHERE id = ?", [cls.id]);
    return ok(null, env);
  }
  if (path === "/api/teacher/import" && method === "POST") {
    const denied = requirePerm(ctx, "student:write");
    if (denied)
      return denied;
    const d = await request.json();
    const teacherAccount = ctx.user.role === "admin" && d.teacher_account ? d.teacher_account : ctx.user.account;
    const teacher = await db.queryOne("SELECT account, name FROM users WHERE account = ? AND role = ?", [teacherAccount, "teacher"]);
    if (!teacher)
      return fail("\u6559\u5E08\u53F7\u4E0D\u5B58\u5728\uFF1A" + teacherAccount, 400, env);
    const rows = Array.isArray(d.rows) ? d.rows : parseImportRows(String(d.csv || ""));
    if (rows.length === 0)
      return fail("\u6CA1\u6709\u53EF\u5BFC\u5165\u7684\u6570\u636E", 400, env);
    const className = d.class_name || (rows.find((r) => r.bj) || {}).bj || "";
    if (!className)
      return fail("\u8BF7\u6307\u5B9A\u73ED\u7EA7\u540D\u79F0", 400, env);
    let cls = await db.queryOne("SELECT * FROM classes WHERE name = ?", [className]);
    if (!cls) {
      const r = await db.insert(
        "INSERT INTO classes (name, teacher_account, major, grade, created_at) VALUES (?, ?, ?, ?, ?)",
        [className, teacherAccount, d.major || "", d.grade || "", now()]
      );
      cls = { id: r.insertId, name: className, teacher_account: teacherAccount };
    } else if (cls.teacher_account !== teacherAccount) {
      return fail(`\u73ED\u7EA7\u300C${className}\u300D\u5F52\u5C5E\u5176\u4ED6\u8F85\u5BFC\u5458\uFF08${cls.teacher_account}\uFF09`, 403, env);
    }
    const hash = import_bcryptjs2.default.hashSync(DEFAULT_STUDENT_PASSWORD, 10);
    const created = [];
    const skipped = [];
    for (const row of rows) {
      const xh = String(row.xh || row[0] || "").trim();
      const xm = String(row.xm || row[1] || "").trim();
      if (!xh || !xm) {
        skipped.push({ xh, reason: "\u5B66\u53F7\u6216\u59D3\u540D\u4E3A\u7A7A" });
        continue;
      }
      const existed = await db.queryOne("SELECT id FROM students WHERE xh = ?", [xh]);
      if (existed) {
        skipped.push({ xh, reason: "\u5B66\u53F7\u5DF2\u5B58\u5728" });
        continue;
      }
      const zhuanye = String(row.zhuanye || row[2] || d.major || "").trim();
      await db.insert(
        "INSERT OR IGNORE INTO users (role, account, password_hash, name, status, created_at) VALUES (?, ?, ?, ?, 1, ?)",
        ["student", xh, hash, xm, now()]
      );
      await db.insert(
        `INSERT INTO students (xh, xm, zhuanye, bj, fdy, class_id, zhuanye_score, deyu_ganbu, deyu_rongyu, zhiyu_jineng)
         VALUES (?, ?, ?, ?, ?, ?, 80, '[]', '[]', '[]')`,
        [xh, xm, zhuanye, className, teacherAccount, cls.id]
      );
      created.push(xh);
    }
    return ok({ class_id: cls.id, class_name: className, teacher_account: teacherAccount, created, skipped }, env);
  }
  if (path === STUDENTS_PATH && method === "GET") {
    const denied = requirePerm(ctx, "student:read");
    if (denied)
      return denied;
    const { bj, xh, xm, class_id } = Object.fromEntries(searchParams);
    let sql = "SELECT * FROM students s WHERE 1=1";
    const params = [];
    const scope = ownerScope(ctx);
    sql += scope.sql;
    params.push(...scope.params);
    if (bj) {
      sql += " AND s.bj = ?";
      params.push(bj);
    }
    if (class_id) {
      sql += " AND s.class_id = ?";
      params.push(class_id);
    }
    if (xh) {
      sql += " AND s.xh = ?";
      params.push(xh);
    }
    if (xm) {
      sql += " AND s.xm LIKE ?";
      params.push("%" + xm + "%");
    }
    sql += " ORDER BY s.xh";
    return ok(await db.query(sql, params), env);
  }
  if (path === STUDENTS_PATH && method === "POST") {
    const denied = requirePerm(ctx, "student:write");
    if (denied)
      return denied;
    const d = await request.json();
    if (!d.xh || !d.xm)
      return fail("\u5B66\u53F7\u548C\u59D3\u540D\u5FC5\u586B", 400, env);
    if (await db.queryOne("SELECT id FROM students WHERE xh = ?", [d.xh]))
      return fail("\u5B66\u53F7\u5DF2\u5B58\u5728", 400, env);
    const classId = d.class_id ? Number(d.class_id) : null;
    let className = d.bj || "";
    let teacherAccount = ctx.user.account;
    if (classId) {
      const { cls, error } = await assertOwnClass(ctx, classId);
      if (error)
        return error;
      className = cls.name;
      teacherAccount = cls.teacher_account;
    }
    const hash = import_bcryptjs2.default.hashSync(DEFAULT_STUDENT_PASSWORD, 10);
    await db.insert(
      "INSERT OR IGNORE INTO users (role, account, password_hash, name, status, created_at) VALUES (?, ?, ?, ?, 1, ?)",
      ["student", d.xh, hash, d.xm, now()]
    );
    const r = await db.insert(
      `INSERT INTO students (xh, xm, zhuanye, bj, fdy, class_id, zhuanye_score, deyu_ganbu, deyu_rongyu, zhiyu_jineng)
       VALUES (?, ?, ?, ?, ?, ?, ?, '[]', '[]', '[]')`,
      [d.xh, d.xm, d.zhuanye || "", className, teacherAccount, classId, Number(d.zhuanye_score) || 80]
    );
    return ok({ id: r.insertId }, env);
  }
  const sm = path.match(STUDENT_RE);
  if (sm && method === "GET") {
    const denied = requirePerm(ctx, "student:read");
    if (denied)
      return denied;
    const { stu, error } = await assertOwnStudent(ctx, sm[1]);
    if (error)
      return error;
    return ok(stu, env);
  }
  if (sm && method === "PUT") {
    const denied = requirePerm(ctx, "student:write");
    if (denied)
      return denied;
    const { stu, error } = await assertOwnStudent(ctx, sm[1]);
    if (error)
      return error;
    const d = await request.json();
    const sets = [];
    const params = [];
    for (const f of INFO_FIELDS) {
      if (d[f] !== void 0) {
        sets.push(f + " = ?");
        params.push(d[f]);
      }
    }
    for (const f of NUM_FIELDS) {
      if (d[f] !== void 0) {
        sets.push(f + " = ?");
        params.push(Number(d[f]) || 0);
      }
    }
    for (const f of JSON_FIELDS) {
      if (d[f] !== void 0) {
        sets.push(f + " = ?");
        params.push(JSON.stringify(d[f]));
      }
    }
    if (d.class_id !== void 0) {
      const { cls, error: ce } = await assertOwnClass(ctx, d.class_id);
      if (ce)
        return ce;
      sets.push("class_id = ?");
      params.push(cls.id);
      sets.push("bj = ?");
      params.push(cls.name);
      sets.push("fdy = ?");
      params.push(cls.teacher_account);
    }
    if (sets.length === 0)
      return fail("\u65E0\u66F4\u65B0\u5B57\u6BB5", 400, env);
    params.push(sm[1]);
    await db.update("UPDATE students SET " + sets.join(", ") + " WHERE xh = ?", params);
    if (d.xm && d.xm !== stu.xm)
      await db.update("UPDATE users SET name = ? WHERE account = ?", [d.xm, sm[1]]);
    return ok(null, env);
  }
  if (sm && method === "DELETE") {
    const denied = requirePerm(ctx, "student:write");
    if (denied)
      return denied;
    const { stu, error } = await assertOwnStudent(ctx, sm[1]);
    if (error)
      return error;
    await db.run("DELETE FROM attendance WHERE student_id = ?", [stu.id]);
    await db.run("DELETE FROM proofs WHERE application_id IN (SELECT id FROM applications WHERE student_id = ?)", [stu.id]);
    await db.run("DELETE FROM application_items WHERE application_id IN (SELECT id FROM applications WHERE student_id = ?)", [stu.id]);
    await db.run("DELETE FROM applications WHERE student_id = ?", [stu.id]);
    await db.run("DELETE FROM students WHERE id = ?", [stu.id]);
    await db.run("DELETE FROM users WHERE account = ? AND role = ?", [sm[1], "student"]);
    return ok(null, env);
  }
  if (path === ATTENDANCE_PATH && method === "GET") {
    const denied = requirePerm(ctx, "attendance:read");
    if (denied)
      return denied;
    const { date, from, to, class_id, xh } = Object.fromEntries(searchParams);
    let sql = `SELECT a.id, a.student_id, a.date, a.status, a.remark, a.created_by,
                      s.xh, s.xm, s.bj
               FROM attendance a JOIN students s ON a.student_id = s.id WHERE 1=1`;
    const params = [];
    const scope = ownerScope(ctx, "s");
    sql += scope.sql;
    params.push(...scope.params);
    if (date) {
      sql += " AND a.date = ?";
      params.push(date);
    }
    if (from) {
      sql += " AND a.date >= ?";
      params.push(from);
    }
    if (to) {
      sql += " AND a.date <= ?";
      params.push(to);
    }
    if (class_id) {
      sql += " AND s.class_id = ?";
      params.push(class_id);
    }
    if (xh) {
      sql += " AND s.xh = ?";
      params.push(xh);
    }
    sql += " ORDER BY a.date DESC, s.xh";
    return ok(await db.query(sql, params), env);
  }
  if (path === ATTENDANCE_PATH && method === "POST") {
    const denied = requirePerm(ctx, "attendance:write");
    if (denied)
      return denied;
    const d = await request.json();
    if (!d.date || !Array.isArray(d.records))
      return fail("\u7F3A\u5C11\u65E5\u671F\u6216\u8003\u52E4\u660E\u7EC6", 400, env);
    const createdAt = now();
    let affected = 0;
    for (const rec of d.records) {
      if (!rec.xh)
        continue;
      const status = ATTENDANCE_STATUS.includes(rec.status) ? rec.status : "present";
      const stu = await db.queryOne("SELECT * FROM students WHERE xh = ?", [rec.xh]);
      if (!stu)
        continue;
      if (ctx.user.role !== "admin" && stu.fdy !== ctx.user.account)
        continue;
      await db.run(
        `INSERT INTO attendance (student_id, date, status, remark, created_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(student_id, date) DO UPDATE SET
           status = excluded.status, remark = excluded.remark,
           created_by = excluded.created_by, created_at = excluded.created_at`,
        [stu.id, d.date, status, rec.remark || "", ctx.user.account, createdAt]
      );
      affected++;
    }
    return ok({ affected }, env);
  }
  const am = path.match(ATTENDANCE_RE);
  if (am && (method === "PUT" || method === "DELETE")) {
    const denied = requirePerm(ctx, "attendance:write");
    if (denied)
      return denied;
    const row = await db.queryOne(
      "SELECT a.*, s.fdy FROM attendance a JOIN students s ON a.student_id = s.id WHERE a.id = ?",
      [am[1]]
    );
    if (!row)
      return fail("\u8003\u52E4\u8BB0\u5F55\u4E0D\u5B58\u5728", 404, env);
    if (ctx.user.role !== "admin" && row.fdy !== ctx.user.account)
      return fail("\u53EA\u80FD\u64CD\u4F5C\u81EA\u5DF1\u73ED\u7EA7\u7684\u8003\u52E4", 403, env);
    if (method === "DELETE") {
      await db.run("DELETE FROM attendance WHERE id = ?", [am[1]]);
      return ok(null, env);
    }
    const d = await request.json();
    const status = ATTENDANCE_STATUS.includes(d.status) ? d.status : row.status;
    await db.update("UPDATE attendance SET status = ?, remark = ? WHERE id = ?", [status, d.remark ?? row.remark, am[1]]);
    return ok(null, env);
  }
  if (path === APPS_PATH && method === "GET") {
    const denied = requirePerm(ctx, "application:read");
    if (denied)
      return denied;
    const status = searchParams.get("status");
    let sql = `SELECT a.*, s.xh, s.xm, s.bj, s.zhuanye
               FROM applications a JOIN students s ON a.student_id = s.id WHERE 1=1`;
    const params = [];
    const scope = ownerScope(ctx, "s");
    sql += scope.sql;
    params.push(...scope.params);
    if (status) {
      sql += " AND a.status = ?";
      params.push(status);
    }
    sql += " ORDER BY a.created_at DESC";
    return ok(await db.query(sql, params), env);
  }
  const appMatch = path.match(APP_RE);
  if (appMatch && method === "GET") {
    const denied = requirePerm(ctx, "application:read");
    if (denied)
      return denied;
    const app = await db.queryOne(
      `SELECT a.*, s.xh, s.xm, s.bj, s.zhuanye, s.fdy FROM applications a
       JOIN students s ON a.student_id = s.id WHERE a.id = ?`,
      [appMatch[1]]
    );
    if (!app)
      return fail("\u7533\u8BF7\u4E0D\u5B58\u5728", 404, env);
    if (ctx.user.role !== "admin" && app.fdy !== ctx.user.account)
      return fail("\u53EA\u80FD\u67E5\u770B\u672C\u73ED\u5B66\u751F\u7684\u7533\u8BF7", 403, env);
    const item = await db.queryOne("SELECT * FROM application_items WHERE application_id = ?", [app.id]);
    const proofs = await db.query("SELECT * FROM proofs WHERE application_id = ?", [app.id]);
    return ok({
      ...app,
      detail: item ? JSON.parse(item.detail) : null,
      scores: item ? {
        deyu_score: item.deyu_score,
        zhiyu_reward: item.zhiyu_reward,
        tiyu_reward: item.tiyu_reward,
        meiyu_reward: item.meiyu_reward,
        laoyu_reward: item.laoyu_reward,
        koufen: item.koufen
      } : null,
      proofs: proofs.map((p) => ({
        id: p.id,
        item_key: p.item_key,
        file_name: p.file_name,
        file_type: p.file_type,
        size: p.size,
        file_path: p.file_path
      }))
    }, env);
  }
  const rm = path.match(REVIEW_RE);
  if (rm && method === "PUT") {
    const denied = requirePerm(ctx, "application:review");
    if (denied)
      return denied;
    const appId = rm[1];
    const { action, reject_reason } = await request.json();
    const app = await db.queryOne(
      "SELECT a.*, s.fdy FROM applications a JOIN students s ON a.student_id = s.id WHERE a.id = ?",
      [appId]
    );
    if (!app)
      return fail("\u7533\u8BF7\u4E0D\u5B58\u5728", 404, env);
    if (ctx.user.role !== "admin" && app.fdy !== ctx.user.account)
      return fail("\u53EA\u80FD\u5BA1\u6838\u672C\u73ED\u5B66\u751F\u7684\u7533\u8BF7", 403, env);
    if (app.status !== "pending")
      return fail("\u8BE5\u7533\u8BF7\u5DF2\u5904\u7406", 400, env);
    const reviewedAt = now();
    const reviewerId = ctx.user.id;
    if (action === "approve") {
      await db.update(
        "UPDATE applications SET status = ?, reviewed_at = ?, reviewer_id = ? WHERE id = ?",
        ["approved", reviewedAt, reviewerId, appId]
      );
      await applyScores(db, app);
      return ok(null, env);
    }
    if (action === "reject") {
      await db.update(
        "UPDATE applications SET status = ?, reviewed_at = ?, reviewer_id = ?, reject_reason = ? WHERE id = ?",
        ["rejected", reviewedAt, reviewerId, reject_reason || "\u672A\u586B\u5199\u539F\u56E0", appId]
      );
      return ok(null, env);
    }
    return fail("\u65E0\u6548\u64CD\u4F5C", 400, env);
  }
  return null;
}
__name(handleTeacher, "handleTeacher");
async function applyScores(db, app) {
  const item = await db.queryOne("SELECT * FROM application_items WHERE application_id = ?", [app.id]);
  if (!item)
    return;
  const stu = await db.queryOne("SELECT * FROM students WHERE id = ?", [app.student_id]);
  if (!stu)
    return;
  const sets = [];
  const params = [];
  for (const { item: key, column } of SCORE_FIELDS) {
    const value = Number(item[key]) || 0;
    if (value > 0) {
      sets.push(column + " = ?");
      params.push((Number(stu[column]) || 0) + value);
    }
  }
  if (item.koufen < 0) {
    sets.push("koufen_chufen = ?");
    params.push((Number(stu.koufen_chufen) || 0) + Math.abs(item.koufen));
  }
  if (sets.length === 0)
    return;
  params.push(stu.id);
  await db.update("UPDATE students SET " + sets.join(", ") + " WHERE id = ?", params);
}
__name(applyScores, "applyScores");

// src/routes/admin.js
var import_bcryptjs3 = __toESM(require_bcrypt());
var PERM_PATH = "/api/admin/permissions";
var ACCOUNTS_PATH = "/api/admin/accounts";
var ACCOUNT_RE = /^\/api\/admin\/accounts\/(\d+)$/;
var DEFAULT_PASSWORD = "123456";
async function rolePermissions(db, role) {
  const set = new Set(ROLE_DEFAULTS[role] || []);
  const rows = await db.query("SELECT permission_key, granted FROM role_permissions WHERE role = ?", [role]);
  for (const r of rows) {
    if (r.granted)
      set.add(r.permission_key);
    else
      set.delete(r.permission_key);
  }
  return [...set];
}
__name(rolePermissions, "rolePermissions");
async function allRoles(db) {
  const rows = await db.query("SELECT DISTINCT role FROM users");
  const roles = new Set(rows.map((r) => r.role));
  for (const r of Object.keys(ROLE_LABELS))
    roles.add(r);
  return [...roles];
}
__name(allRoles, "allRoles");
async function isLastAdmin(db, userId) {
  const row = await db.queryOne("SELECT COUNT(*) AS c FROM users WHERE role = 'admin' AND status = 1", []);
  const target = await db.queryOne("SELECT role, status FROM users WHERE id = ?", [userId]);
  if (!target)
    return false;
  return target.role === "admin" && target.status === 1 && (!row || row.c <= 1);
}
__name(isLastAdmin, "isLastAdmin");
async function handleAdmin(path, method, ctx) {
  const { request, env, db } = ctx;
  if (path === "/api/admin/overview" && method === "GET") {
    const denied = requirePerm(ctx, "user:manage");
    if (denied)
      return denied;
    const one = /* @__PURE__ */ __name(async (sql, params = []) => (await db.queryOne(sql, params) || {}).c || 0, "one");
    return ok({
      classes: await one("SELECT COUNT(*) AS c FROM classes"),
      students: await one("SELECT COUNT(*) AS c FROM students"),
      teachers: await one("SELECT COUNT(*) AS c FROM users WHERE role = 'teacher'"),
      pendingApplications: await one("SELECT COUNT(*) AS c FROM applications WHERE status = 'pending'"),
      attendanceToday: await one("SELECT COUNT(*) AS c FROM attendance WHERE date = ?", [now().slice(0, 10)])
    }, env);
  }
  if (path === PERM_PATH && method === "GET") {
    const denied = requirePerm(ctx, "permission:manage");
    if (denied)
      return denied;
    const roles = [];
    for (const role of await allRoles(db)) {
      roles.push({
        key: role,
        label: ROLE_LABELS[role] || role,
        permissions: await rolePermissions(db, role)
      });
    }
    return ok({ permissions: PERMISSION_DEFS, roles }, env);
  }
  if (path === PERM_PATH && method === "PUT") {
    const denied = requirePerm(ctx, "permission:manage");
    if (denied)
      return denied;
    const { role, permissions } = await request.json();
    if (!role)
      return fail("\u7F3A\u5C11\u89D2\u8272", 400, env);
    const next = new Set((permissions || []).filter((k) => PERMISSION_KEYS.includes(k)));
    if (role === "admin")
      next.add("permission:manage");
    await db.run("DELETE FROM role_permissions WHERE role = ?", [role]);
    for (const key of PERMISSION_KEYS) {
      await db.run("INSERT INTO role_permissions (role, permission_key, granted) VALUES (?, ?, ?)", [role, key, next.has(key) ? 1 : 0]);
    }
    return ok({ role, permissions: [...next] }, env);
  }
  if (path === ACCOUNTS_PATH && method === "GET") {
    const denied = requirePerm(ctx, "user:manage");
    if (denied)
      return denied;
    const role = ctx.searchParams.get("role");
    let sql = "SELECT id, role, account, name, status, created_at FROM users WHERE 1=1";
    const params = [];
    if (role) {
      sql += " AND role = ?";
      params.push(role);
    }
    sql += " ORDER BY role, account";
    const users = await db.query(sql, params);
    const withPerms = [];
    for (const u of users) {
      withPerms.push({ ...u, role_label: ROLE_LABELS[u.role] || u.role, permissions: [...await loadPermissions(db, u)] });
    }
    return ok(withPerms, env);
  }
  if (path === ACCOUNTS_PATH && method === "POST") {
    const denied = requirePerm(ctx, "user:manage");
    if (denied)
      return denied;
    const d = await request.json();
    if (!d.account || !d.name || !d.role)
      return fail("\u8D26\u53F7\u3001\u59D3\u540D\u3001\u89D2\u8272\u5FC5\u586B", 400, env);
    if (await db.queryOne("SELECT id FROM users WHERE account = ?", [d.account]))
      return fail("\u8D26\u53F7\u5DF2\u5B58\u5728", 400, env);
    const hash = import_bcryptjs3.default.hashSync(d.password || DEFAULT_PASSWORD, 10);
    const r = await db.insert(
      "INSERT INTO users (role, account, password_hash, name, status, created_at) VALUES (?, ?, ?, ?, 1, ?)",
      [d.role, d.account, hash, d.name, now()]
    );
    if (Array.isArray(d.permissions)) {
      await applyPermissionOverrides(db, { id: r.insertId, role: d.role }, d.permissions);
    }
    return ok({ id: r.insertId }, env);
  }
  const am = path.match(ACCOUNT_RE);
  if (am && method === "PUT") {
    const denied = requirePerm(ctx, "user:manage");
    if (denied)
      return denied;
    const id = am[1];
    const target = await db.queryOne("SELECT * FROM users WHERE id = ?", [id]);
    if (!target)
      return fail("\u8D26\u53F7\u4E0D\u5B58\u5728", 404, env);
    const d = await request.json();
    const nextRole = d.role || target.role;
    const nextStatus = d.status === void 0 ? target.status : Number(d.status) ? 1 : 0;
    if ((nextRole !== "admin" || nextStatus === 0) && await isLastAdmin(db, id)) {
      return fail("\u7CFB\u7EDF\u5FC5\u987B\u4FDD\u7559\u81F3\u5C11\u4E00\u4E2A\u53EF\u7528\u7684\u8D85\u7EA7\u7BA1\u7406\u5458", 400, env);
    }
    const sets = [];
    const params = [];
    if (d.name !== void 0) {
      sets.push("name = ?");
      params.push(d.name);
    }
    if (d.role !== void 0) {
      sets.push("role = ?");
      params.push(d.role);
    }
    if (d.status !== void 0) {
      sets.push("status = ?");
      params.push(nextStatus);
    }
    if (d.password) {
      sets.push("password_hash = ?");
      params.push(import_bcryptjs3.default.hashSync(d.password, 10));
    }
    if (sets.length > 0) {
      params.push(id);
      await db.update("UPDATE users SET " + sets.join(", ") + " WHERE id = ?", params);
    }
    if (Array.isArray(d.permissions)) {
      await applyPermissionOverrides(db, { id: Number(id), role: nextRole }, d.permissions);
    }
    return ok(null, env);
  }
  if (am && method === "DELETE") {
    const denied = requirePerm(ctx, "user:manage");
    if (denied)
      return denied;
    const id = am[1];
    const target = await db.queryOne("SELECT * FROM users WHERE id = ?", [id]);
    if (!target)
      return fail("\u8D26\u53F7\u4E0D\u5B58\u5728", 404, env);
    if (await isLastAdmin(db, id))
      return fail("\u7CFB\u7EDF\u5FC5\u987B\u4FDD\u7559\u81F3\u5C11\u4E00\u4E2A\u53EF\u7528\u7684\u8D85\u7EA7\u7BA1\u7406\u5458", 400, env);
    await db.run("DELETE FROM user_permissions WHERE user_id = ?", [id]);
    await db.run("DELETE FROM users WHERE id = ?", [id]);
    return ok(null, env);
  }
  return null;
}
__name(handleAdmin, "handleAdmin");

// src/routes/files.js
var FILE_RE = /^\/api\/files\/(.+)$/;
var MAX_FILE_SIZE = 10 * 1024 * 1024;
var CHUNK = 8192;
function toBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let out = "";
  for (let i = 0; i < bytes.length; i += CHUNK) {
    out += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
  }
  return btoa(out);
}
__name(toBase64, "toBase64");
function fromBase64(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++)
    bytes[i] = bin.charCodeAt(i);
  return bytes;
}
__name(fromBase64, "fromBase64");
async function handleUpload(path, method, ctx) {
  if (path !== "/api/upload" || method !== "POST")
    return null;
  const { request, env, db } = ctx;
  const kv = env.FILES;
  if (!kv)
    return fail("\u672A\u7ED1\u5B9A KV \u547D\u540D\u7A7A\u95F4 FILES\uFF0C\u8BF7\u68C0\u67E5 wrangler.toml \u7684 [[kv_namespaces]] \u914D\u7F6E", 500, env);
  const formData = await request.formData();
  const applicationId = formData.get("application_id") ? Number(formData.get("application_id")) : null;
  const itemKey = formData.get("item_key") || "general";
  const files = formData.getAll("files");
  if (files.length === 0)
    return fail("\u6CA1\u6709\u6536\u5230\u6587\u4EF6", 400, env);
  const results = [];
  for (const file of files) {
    if (file.size > MAX_FILE_SIZE) {
      return fail("\u6587\u4EF6\u300C" + file.name + "\u300D\u8D85\u8FC7 10MB \u4E0A\u9650\uFF0C\u8BF7\u538B\u7F29\u540E\u91CD\u8BD5", 400, env);
    }
    const key = Date.now() + "_" + Math.random().toString(36).slice(2, 8) + "_" + file.name;
    const type = file.type || "application/octet-stream";
    await kv.put(key, JSON.stringify({ t: type, d: toBase64(await file.arrayBuffer()) }));
    const r = await db.insert(
      "INSERT INTO proofs (application_id, item_key, file_path, file_name, file_type, size) VALUES (?, ?, ?, ?, ?, ?)",
      [applicationId, itemKey, key, file.name, type, file.size]
    );
    results.push({ id: r.insertId, file_name: file.name, file_path: key });
  }
  return ok(results, env);
}
__name(handleUpload, "handleUpload");
async function handleFileDownload(path, method, ctx) {
  if (method !== "GET")
    return null;
  const m = path.match(FILE_RE);
  if (!m)
    return null;
  const { env } = ctx;
  const kv = env.FILES;
  if (!kv)
    return fail("\u672A\u7ED1\u5B9A KV \u547D\u540D\u7A7A\u95F4 FILES", 500, env);
  let key = m[1];
  try {
    key = decodeURIComponent(key);
  } catch {
  }
  const raw = await kv.get(key);
  if (!raw)
    return json({ code: 1, msg: "\u6587\u4EF6\u4E0D\u5B58\u5728", data: null }, 404, env);
  let envelope;
  try {
    envelope = JSON.parse(raw);
  } catch {
    return json({ code: 1, msg: "\u6587\u4EF6\u6570\u636E\u635F\u574F", data: null }, 500, env);
  }
  return new Response(fromBase64(envelope.d), {
    headers: {
      "Content-Type": envelope.t || "application/octet-stream",
      "Cache-Control": "private, max-age=3600",
      ...corsHeaders(env)
    }
  });
}
__name(handleFileDownload, "handleFileDownload");

// src/index.js
var src_default = {
  async fetch(request, env) {
    if (request.method === "OPTIONS")
      return preflight(env);
    const url = new URL(request.url);
    const { pathname: path, searchParams } = url;
    const method = request.method;
    const ctx = { request, env, url, searchParams, db: createDb(env.DB) };
    try {
      if (path.startsWith("/api/files/")) {
        const res = await handleFileDownload(path, method, ctx);
        if (res)
          return res;
      }
      if (path === "/api/auth/login") {
        const res = await handleLogin(method, ctx);
        if (res)
          return res;
      }
      const user = await getUserFromRequest(request, env);
      if (!user)
        return fail("\u672A\u767B\u5F55\u6216\u767B\u5F55\u5DF2\u8FC7\u671F", 401, env);
      const account = await ctx.db.queryOne("SELECT id, role, account, name, status FROM users WHERE id = ?", [user.id]);
      if (!account || Number(account.status) === 0)
        return fail("\u8D26\u53F7\u5DF2\u505C\u7528\uFF0C\u8BF7\u8054\u7CFB\u7BA1\u7406\u5458", 403, env);
      ctx.user = account;
      ctx.perms = await loadPermissions(ctx.db, account);
      if (path.startsWith("/api/student/")) {
        if (account.role !== "student")
          return fail("\u65E0\u6743\u9650", 403, env);
        return await handleStudent(path, method, ctx) || notFound(env);
      }
      if (path.startsWith("/api/teacher/")) {
        if (account.role !== "teacher" && account.role !== "admin")
          return fail("\u65E0\u6743\u9650", 403, env);
        return await handleTeacher(path, method, ctx) || notFound(env);
      }
      if (path.startsWith("/api/admin/")) {
        if (account.role !== "admin")
          return fail("\u65E0\u6743\u9650", 403, env);
        return await handleAdmin(path, method, ctx) || notFound(env);
      }
      if (path === "/api/upload") {
        return await handleUpload(path, method, ctx) || notFound(env);
      }
      return notFound(env);
    } catch (e) {
      return json({ code: 1, msg: e.message || "\u670D\u52A1\u5668\u5185\u90E8\u9519\u8BEF", data: null }, 500, env);
    }
  }
};
export {
  src_default as default
};
/*! Bundled license information:

bcryptjs/dist/bcrypt.js:
  (**
   * @license bcrypt.js (c) 2013 Daniel Wirtz <dcode@dcode.io>
   * Released under the Apache License, Version 2.0
   * see: https://github.com/dcodeIO/bcrypt.js for details
   *)
*/
//# sourceMappingURL=index.js.map
