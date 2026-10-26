#!/usr/bin/env python3
"""Read-only R3 batch04 public native-render parity; no production writes."""
import html
import json
import re
import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parent.parent / 'content/r3-batch04/wiki'
IDS = tuple(f'W{x:03}' for x in range(58,108))
SKIP={'script','style','svg','noscript','template'}
VOID={'area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'}
TOKEN=re.compile(r'\[\[(article|page):([^\]\|]+)\|([^\]]+)\]\]')
IMAGE_MARKDOWN=re.compile(r'^!\[([^\]\r\n]{1,220})\]\((https://halleus\.ir/storage/v1/object/public/wiki-media/[a-f0-9]{2}/[a-f0-9]{64}\.webp)\)$')

def norm(s):return re.sub(r'\s+', '', html.unescape(str(s)).replace('\u200e','').replace('\u200f',''))
def plain(s):return TOKEN.sub(lambda m:m.group(3),s)
class ArticleParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack=[];self.active=[];self.main=[];self.title='';self.description='';self.canonical='';self.h1=[];self.sections=[];self.links=[];self.main_found=False;self.body_found=False
    def within(self,name):return any(x['id']==name for x in self.stack)
    def skipped(self):return any(x['tag'] in SKIP for x in self.stack)
    def handle_starttag(self,tag,attrs):
        attrs=dict(attrs);aid=attrs.get('id','')
        if tag=='meta' and attrs.get('name')=='description':self.description=attrs.get('content','')
        if tag=='link' and 'canonical' in attrs.get('rel','').split():self.canonical=attrs.get('href','')
        inside=self.within('wiki-article-content') or aid=='wiki-article-content'
        bodysec=self.within('wiki-article-body') and tag=='section' and bool(self.stack) and self.stack[-1]['id']=='wiki-article-body'
        if tag not in VOID:self.stack.append({'tag':tag,'id':aid,'section':len(self.sections) if bodysec else None})
        if bodysec:self.sections.append({'h2':[],'p':[],'li':[],'img':[]})
        if aid=='wiki-article-content':self.main_found=True
        if aid=='wiki-article-body':self.body_found=True
        if self.skipped():return
        if inside and tag=='img':
            section=next((x['section'] for x in reversed(self.stack) if x['section'] is not None),None)
            if section is not None:self.sections[section]['img'].append((attrs.get('src',''),attrs.get('alt','')))
        if tag=='title':self.active.append({'tag':tag,'kind':'title','buf':[],'section':None,'href':''})
        if inside and tag in ('h1','h2','p','li','a'):
            section=next((x['section'] for x in reversed(self.stack) if x['section'] is not None),None)
            self.active.append({'tag':tag,'kind':'content','buf':[],'section':section,'href':attrs.get('href','')})
    def handle_startendtag(self,tag,attrs):
        self.handle_starttag(tag,attrs)
        if tag not in VOID:self.handle_endtag(tag)
    def handle_data(self,data):
        if self.skipped():return
        for a in self.active:a['buf'].append(data)
        if self.within('wiki-article-content'):self.main.append(data)
    def handle_endtag(self,tag):
        if tag in VOID:return
        if not self.skipped():
            for i in range(len(self.active)-1,-1,-1):
                a=self.active[i]
                if a['tag']!=tag:continue
                del self.active[i];val=''.join(a['buf'])
                if a['kind']=='title':self.title=val
                elif tag=='a':self.links.append((a['href'],val,a['section']))
                elif tag=='h1':self.h1.append(val)
                if a['section'] is not None and tag in ('h2','p','li'):
                    self.sections[a['section']][tag].append(val)
                break
        for i in range(len(self.stack)-1,-1,-1):
            if self.stack[i]['tag']==tag:
                del self.stack[i:];break

def check(doc,markup):
    p=ArticleParser();p.feed(markup);c=doc['content'];bad=[]
    if not p.main_found or not p.body_found:bad.append('missing article native container')
    if norm(c['seo_title']) not in norm(p.title):bad.append('SEO title')
    if norm(c['meta_description'])!=norm(p.description):bad.append('meta description')
    if p.canonical.rstrip('/')!=doc['expected_url']:bad.append('canonical')
    if norm(c['title']) not in [norm(x) for x in p.h1]:bad.append('H1')
    visible=norm(''.join(p.main))
    blocks=[c['intro'],*c['key_points'],*[v for section in c['sections'] for v in [section['title'],*[x for x in section['paragraphs'] if not IMAGE_MARKDOWN.fullmatch(x)],*section.get('bullets',[])] ]]
    cursor=0
    for i,b in enumerate(blocks):
        expected=norm(plain(b));n=visible.find(expected,cursor)
        if n<0:bad.append(f'visible approved block #{i} missing/out of order')
        else:cursor=n+len(expected)
    required_sections=len(c['sections'])+(1 if c['sources'] else 0)
    if len(p.sections)!=required_sections:bad.append(f'body native section count {len(p.sections)} != {required_sections}')
    for i,section in enumerate(c['sections']):
        if i>=len(p.sections):break
        media_matches=[IMAGE_MARKDOWN.fullmatch(x) for x in section['paragraphs']]
        expected_paragraphs=[x for x,m in zip(section['paragraphs'],media_matches) if not m]
        expected_images=[(m.group(2),m.group(1)) for m in media_matches if m]+[(media['src'],media['alt']) for media in section.get('media',[])]
        for field,expected in (('h2',[section['title']]),('p',expected_paragraphs),('li',section.get('bullets',[]))):
            got=[norm(x) for x in p.sections[i][field]]
            if got!=[norm(plain(x)) for x in expected]:bad.append(f'section[{i}].{field} parity mismatch')
        if p.sections[i]['img']!=expected_images:bad.append(f'section[{i}].img parity mismatch')
    if c['sources'] and len(p.sections)>len(c['sections']):
        if [norm(x) for x in p.sections[-1]['h2']]!=[norm('منابع و مطالعهٔ بیشتر')]:bad.append('sources heading')
    found=[(urlsplit(url).path,norm(label)) for url,label,sec in p.links]
    for token in doc['selected_exact_tokens']:
        m=TOKEN.fullmatch(token)
        if not m:bad.append('malformed approved token');continue
        kind,target,label=m.groups();href='/wiki/'+target if kind=='article' else target
        if found.count((href,norm(label)))!=1:bad.append('approved anchor missing/duplicate: '+href+' '+label)
    return bad,len(blocks),len(c['sections']),len(doc['selected_exact_tokens'])

def fixture(doc):
    c=doc['content'];s=['<html><head><title>'+html.escape(c['seo_title'])+'</title>','<meta name="description" content="'+html.escape(c['meta_description'],quote=True)+'">','<link rel="canonical" href="'+doc['expected_url']+'"></head><body>','<article id="wiki-article-content"><h1>'+html.escape(c['title'])+'</h1>']
    def render(x):
        x=html.escape(x)
        return TOKEN.sub(lambda m:f'<a href="'+('/wiki/'+m.group(2) if m.group(1)=='article' else m.group(2))+'">'+m.group(3)+'</a>',x)
    # Actual real UI renders intro as one paragraph; explicit newline stays in the paragraph text.
    s+=['<p>'+render(c['intro'])+'</p>','<section><h2>خلاصهٔ مقاله</h2><ul>']+[f'<li>{render(k)}</li>' for k in c['key_points']]+['</ul></section>','<div id="wiki-article-body">']
    def render_paragraph(t):
        m=IMAGE_MARKDOWN.fullmatch(t)
        if m:return '<figure><img alt="'+html.escape(m.group(1),quote=True)+'" src="'+html.escape(m.group(2),quote=True)+'"></figure>'
        return f'<p>{render(t)}</p>'
    for section in c['sections']:
        s+=['<section><h2>'+html.escape(section['title'])+'</h2>']+[render_paragraph(t) for t in section['paragraphs']]+[f'<li>{render(t)}</li>' for t in section.get('bullets',[])]+['<figure><img alt="'+html.escape(m['alt'],quote=True)+'" src="'+html.escape(m['src'],quote=True)+'"></figure>' for m in section.get('media',[])]+['</section>']
    if c['sources']:s+=['<section><h2>منابع و مطالعهٔ بیشتر</h2></section>']
    return ''.join(s+['</div></article></body></html>'])

def main():
    if not ROOT.is_dir():sys.exit('SAFETY_FATAL | native candidate folder missing')
    docs={i:json.loads((ROOT/(i+'.json')).read_text(encoding='utf-8')) for i in IDS}
    if sys.argv[1:]==['--self-check']:
        failures=[]
        for i,d in docs.items():
            markup=fixture(d);issues,*_=check(d,markup)
            if issues:failures.append((i,issues[:5]))
            if not check(d,markup.replace('id="wiki-article-body"','id="bad"'))[0]:failures.append((i,'failed missing-body negative'))
            if not check(d,markup.replace('href="/chart"','href="/wrong"'))[0]:failures.append((i,'failed anchor negative'))
            if not check(d,markup.replace(html.escape(d['content']['meta_description'],quote=True),'INVALID',1))[0]:failures.append((i,'failed meta negative'))
            if any(sec.get('media') or any(IMAGE_MARKDOWN.fullmatch(t) for t in sec['paragraphs']) for sec in d['content']['sections']):
                if not check(d,markup.replace('src="https://halleus.ir/storage/v1/object/public/wiki-media/', 'src="/wrong/',1))[0]:failures.append((i,'failed image src negative'))
                if not check(d,markup.replace('alt="', 'alt="WRONG ',1))[0]:failures.append((i,'failed image alt negative'))
        if failures:sys.exit('FAIL | fixtures '+repr(failures[:6]))
        print('PASS | SELF_CHECK 50 real native records + approved inline/native media, missing-body, anchor, SEO and media negative fixtures; no network')
        return
    if sys.argv[1:]!=['--live']:sys.exit('Usage: --self-check | --live')
    failures=0
    for id,doc in docs.items():
        try:
            req=Request(doc['expected_url'],headers={'User-Agent':'Halleus-R3-LiveParity/Batch04','Cache-Control':'no-cache'})
            with urlopen(req,timeout=25) as response:
                if response.status!=200:raise RuntimeError('HTTP '+str(response.status))
                page=response.read().decode('utf-8')
            issues,blocks,sections,links=check(doc,page)
            if issues:failures+=1;print('FAIL | '+id+' | '+'; '.join(issues[:10]))
            else:print(f'PASS | {id} | blocks={blocks} sections={sections} selected_links={links} SEO=PASS')
        except Exception as e:failures+=1;print(f'FAIL | {id} | {type(e).__name__}: {e}')
    print(f'LIVE_PARITY | PASS={50-failures} FAIL={failures} TOTAL=50')
    sys.exit(1 if failures else 0)

if __name__=='__main__':main()
