#!/system/bin/sh
set -eu

#结果会保存在目录
out_tsv="/sdcard/Download/operit_usage_ms.tsv"

today="$(date +%F)"
start_bound="$today 00:00:00"
end_bound="$(date '+%F %H:%M:%S')"
now_h=$(date +%H); now_m=$(date +%M); now_s=$(date +%S)

# 直接从 dumpsys 流式处理，避免变量承载大文本
dumpsys usagestats --daily 2>/dev/null |
awk '
{
  t=""; typ=""; pkg="";
  p = match($0, /time="/);      if (p) t = substr($0, RSTART+6, 19);
  p = match($0, /type=/);       if (p) { rest = substr($0, RSTART+5); split(rest, a, /[ ,"]/); typ=a[1]; }
  p = match($0, /package=/);    if (p) { rest = substr($0, RSTART+8); split(rest, b, /[ ,"]/); pkg=b[1]; }
  if (t=="" || typ=="" || pkg=="") next;

  ev=typ;
  if (typ=="1") ev="ACTIVITY_RESUMED";
  else if (typ=="2") ev="ACTIVITY_PAUSED";
  else if (typ=="23") ev="ACTIVITY_STOPPED";

  if (ev=="ACTIVITY_RESUMED" || ev=="ACTIVITY_PAUSED" || ev=="ACTIVITY_STOPPED")
    print t "\t" ev "\t" pkg;
}
' | LC_ALL=C sort |
awk -F '\t' -v sb="$start_bound" -v eb="$end_bound" -v nh="$now_h" -v nm="$now_m" -v ns="$now_s" '
function tsec(str,   h,m,s){ h=substr(str,12,2)+0; m=substr(str,15,2)+0; s=substr(str,18,2)+0; return h*3600+m*60+s }
BEGIN{ cur_pkg=""; cur_start=0; active_before=""; }
{
  t=$1; ev=$2; pkg=$3;

  if (t < sb) {
    if (ev=="ACTIVITY_RESUMED") active_before=pkg;
    else if ((ev=="ACTIVITY_PAUSED" || ev=="ACTIVITY_STOPPED") && active_before==pkg) active_before="";
    next;
  }
  if (t > eb) next;

  if (cur_pkg=="" && active_before!="") { cur_pkg=active_before; cur_start=tsec(sb); active_before=""; }

  ts=tsec(t);
  if (ev=="ACTIVITY_RESUMED"){
    if (cur_pkg!="" && ts>cur_start) use[cur_pkg]+=ts-cur_start;
    cur_pkg=pkg; cur_start=ts;
  } else if (ev=="ACTIVITY_PAUSED" || ev=="ACTIVITY_STOPPED"){
    if (cur_pkg==pkg && ts>cur_start) { use[cur_pkg]+=ts-cur_start; cur_pkg=""; cur_start=0; }
  }
}
END{
  now_sec=(nh+0)*3600 + (nm+0)*60 + (ns+0);
  if (cur_pkg!="" && now_sec>cur_start) use[cur_pkg]+= now_sec - cur_start;
  for (p in use) printf "%s\t%d\n", p, use[p]*1000;
}
' | sort -k2,2nr > "$out_tsv"

# 打印Top与合计
echo "Time window (local): $start_bound - $end_bound"
echo "Raw TSV saved: $out_tsv"
echo "------ App Foreground Usage (today) ------"
head -15 "$out_tsv" | awk -F '\t' '{ s=int($2/1000); h=int(s/3600); m=int((s%3600)/60); ss=s%60;
  printf "%2d. %-42s %2dh %2dm %2ds\n", NR, $1, h, m, ss; }'
total_ms=$(awk -F '\t' '{sum+=$2} END{print sum}' "$out_tsv")
awk -v ms="$total_ms" 'BEGIN{s=int(ms/1000); h=int(s/3600); m=int((s%3600)/60); ss=s%60;
  printf "--------------------------------------------\nTotal foreground (sum): %dh %dm %ds\n", h,m,ss}'

# 亮屏时长
bs=$(dumpsys batterystats 2>/dev/null | grep -m1 -i "Discharge screen on time" || true)
if [ -n "$bs" ]; then
  tokens=$(echo "$bs" | sed -E "s/.*time: *//; s/\([^)]+\)//; s/([0-9])h/\1 h/g; s/([0-9])m/\1 m/g; s/([0-9])s/\1 s/g; s/([0-9])ms/\1 ms/g")
  h=$(echo "$tokens" | awk '{for(i=1;i<=NF;i++) if($(i+1)=="h"){print $i; exit}}'); h=${h:-0}
  m=$(echo "$tokens" | awk '{for(i=1;i<=NF;i++) if($(i+1)=="m"){print $i; exit}}'); m=${m:-0}
  s=$(echo "$tokens" | awk '{for(i=1;i<=NF;i++) if($(i+1)=="s"){print $i; exit}}'); s=${s:-0}
  ms=$(echo "$tokens" | awk '{for(i=1;i<=NF;i++) if($(i+1)=="ms"){print $i; exit}}'); ms=${ms:-0}
  total_ms=$(( (h*3600 + m*60 + s)*1000 + ms ))
  fmt="$(awk -v ms="$total_ms" 'BEGIN{s=int(ms/1000); h=int(s/3600); m=int((s%3600)/60); ss=s%60; printf("%dh %dm %ds", h,m,ss)}')"
  echo "Screen on time (current discharge cycle): $fmt"
fi