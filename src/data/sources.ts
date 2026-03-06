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
