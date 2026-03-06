/*
 * MIT License
 *
 * Copyright (c) 2026 Matthew Gall <me@matthewgall.dev>
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
import type { Source } from "../types";

export const SOURCES: Source[] = [
  {
    id: "afrinic",
    url: "https://ftp.afrinic.net/pub/stats/afrinic/delegated-afrinic-extended-latest",
  },
  {
    id: "apnic",
    url: "https://ftp.apnic.net/pub/stats/apnic/delegated-apnic-extended-latest",
  },
  {
    id: "arin",
    url: "https://ftp.arin.net/pub/stats/arin/delegated-arin-extended-latest",
  },
  {
    id: "iana.asn",
    url: "https://data.iana.org/rdap/asn.json",
  },
  {
    id: "iana.dns",
    url: "https://data.iana.org/rdap/dns.json",
  },
  {
    id: "iana.ipv4",
    url: "https://data.iana.org/rdap/ipv4.json",
  },
  {
    id: "iana.ipv6",
    url: "https://data.iana.org/rdap/ipv6.json",
  },
  {
    id: "iana.rootzone",
    url: "https://www.internic.net/domain/root.zone",
  },
  {
    id: "iana.tlds",
    url: "https://data.iana.org/TLD/tlds-alpha-by-domain.txt",
  },
  {
    id: "lacnic",
    url: "https://ftp.lacnic.net/pub/stats/lacnic/delegated-lacnic-extended-latest",
  },
  {
    id: "publicsuffix",
    url: "https://publicsuffix.org/list/public_suffix_list.dat",
  },
  {
    id: "ripe",
    url: "https://ftp.ripe.net/pub/stats/ripencc/delegated-ripencc-extended-latest",
  },
];
