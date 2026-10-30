# 临时脚本：解压 docx 并提取正文纯文本，输出 paragraphs.txt
$ErrorActionPreference = 'Stop'
$src = 'C:\Users\17570\AppData\Local\Temp\codebuddy-dropped-files\628e7560-da2a-44f8-bcfe-791698d5c946\1.湖南民族职业学院学生综合素质测评实施办法(3).docx'
$tmp = 'C:\Users\17570\Desktop\综测系统\.tmp-docx'
if (Test-Path $tmp) { Remove-Item $tmp -Recurse -Force }
Copy-Item $src "$tmp.zip" -Force
Expand-Archive "$tmp.zip" $tmp -Force
Get-ChildItem "$tmp\word" | Select-Object -ExpandProperty Name
