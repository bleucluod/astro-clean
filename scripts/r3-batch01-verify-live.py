#!/usr/bin/env python3
"""Read-only R3 batch01 native-render live parity. --self-check uses realistic fixtures."""
import html
import json
import re
import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parent.parent / 'content/r3-batch01/wiki'
IDS = ('W005','W009','W010','W011','W012','W013','W014','W015','W016','W017')
VOID = {'area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'}
SKIP = {'script','style','noscript','template','svg'}
INLINE = re.compile(r'\[\[(article|page):([^\]\|]+)\|([^\]]+)\]\]')


def normalized(value):
    return re.sub(r'\s+', '', html.unescape(str(value)).replace('\u200e','').replace('\u200f',''))


def readable(value):
    return INLINE.sub(lambda match: match.group(3), value)


class WikiPageParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack = []
        self.capture = []
        self.title = ''
        self.description = ''
        self.canonical = ''
        self.main_text = []
        self.headings = []
        self.links = []
        self.body_sections = []
        self.main_found = False
        self.body_found = False

    def in_scope(self, marker):
        return any(item['id'] == marker for item in self.stack)

    def skipped(self):
        return any(item['tag'] in SKIP for item in self.stack)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'meta' and attrs.get('name','').lower() == 'description':
            self.description = attrs.get('content','')
        if tag == 'link' and 'canonical' in attrs.get('rel','').lower().split():
            self.canonical = attrs.get('href','')
        parent_is_body = bool(self.stack and self.stack[-1]['id'] == 'wiki-article-body')
        entry = {'tag':tag, 'id':attrs.get('id'), 'section':None}
        if parent_is_body and tag == 'section':
            entry['section'] = len(self.body_sections)
            self.body_sections.append({'h2':[],'p':[],'li':[]})
        if tag not in VOID:
            self.stack.append(entry)
        if entry['id'] == 'wiki-article-content': self.main_found = True
        if entry['id'] == 'wiki-article-body': self.body_found = True
        if self.skipped(): return
        if tag == 'title':
            self.capture.append({'tag':tag,'parts':[],'kind':'title','section':None,'href':''})
        if self.in_scope('wiki-article-content') and tag in {'h1','h2','p','li','a'}:
            sec = next((row['section'] for row in reversed(self.stack) if row['section'] is not None),None)
            self.capture.append({'tag':tag,'parts':[],'kind':'content','section':sec,'href':attrs.get('href','')})

    def handle_startendtag(self, tag, attrs):
        # HTMLParser would otherwise emit a false closing event for <img /> etc.
        self.handle_starttag(tag,attrs)
        if tag not in VOID:
            self.handle_endtag(tag)

    def handle_data(self, value):
        if self.skipped(): return
        for cap in self.capture:
            cap['parts'].append(value)
        if self.in_scope('wiki-article-content'):
            self.main_text.append(value)

    def handle_endtag(self, tag):
        if tag in VOID: return  # HTML void tags must never decrease nesting depth
        if not self.skipped():
            for i in range(len(self.capture)-1,-1,-1):
                item = self.capture[i]
                if item['tag'] != tag: continue
                self.capture.pop(i)
                value = ''.join(item['parts'])
                if item['kind'] == 'title': self.title = value
                elif item['tag'] == 'a': self.links.append((item['href'],value))
                elif item['tag'] in ('h1','h2'): self.headings.append((item['tag'],value))
                if item['section'] is not None and item['tag'] in ('h2','p','li'):
                    self.body_sections[item['section']][item['tag']].append(value)
                break
        # Strictly close only the matching node; don't pop on unmatched tags.
        for index in range(len(self.stack)-1,-1,-1):
            if self.stack[index]['tag']==tag:
                del self.stack[index:]
                break


def check(doc, markup):
    page=WikiPageParser()
    page.feed(markup)
    content=doc['content']
    issues=[]
    if not page.main_found: issues.append('missing #wiki-article-content')
    if not page.body_found: issues.append('missing #wiki-article-body')
    if normalized(content['seo_title']) not in normalized(page.title): issues.append('SEO title')
    if normalized(content['meta_description']) != normalized(page.description): issues.append('meta description')
    if page.canonical.rstrip('/') != doc['expected_url']: issues.append('canonical')
    if normalized(content['title']) not in [normalized(x) for t,x in page.headings if t=='h1']:
        issues.append('H1')
    visible = normalized(''.join(page.main_text))
    blocks = [content['intro'],*content['key_points']]
    for section in content['sections']:
        blocks.extend((section['title'],*section['paragraphs'],*section.get('bullets',[])))
    cursor = 0
    for index,block in enumerate(blocks):
        needle=normalized(readable(block))
        if not needle:
            issues.append(f'empty expected block {index}');continue
        pos=visible.find(needle,cursor)
        if pos<0: issues.append(f'visible block #{index}')
        else: cursor=pos+len(needle)
    expect_sec=len(content['sections'])+(1 if content['sources'] else 0)
    if len(page.body_sections)!=expect_sec:
        issues.append(f'article body section count actual={len(page.body_sections)} expected={expect_sec}')
    for index,section in enumerate(content['sections']):
        if index>=len(page.body_sections): break
        actual=page.body_sections[index]
        for label,expected in (('h2',[section['title']]),('p',section['paragraphs']),('li',section.get('bullets',[]))):
            if list(map(normalized,actual[label]))!=list(map(lambda x:normalized(readable(x)),expected)):
                issues.append(f'section[{index}].{label} does not match approved order and text')
    if content['sources'] and len(page.body_sections)>len(content['sections']):
        if list(map(normalized,page.body_sections[-1]['h2']))!=[normalized('منابع و مطالعهٔ بیشتر')]:
            issues.append('sources heading')
    links=[(urlsplit(url).path,normalized(label)) for url,label in page.links]
    for token in doc['selected_exact_tokens']:
        match=INLINE.fullmatch(token)
        if not match:
            issues.append(f'invalid approved token: {token[:80]}');continue
        kind,target,label=match.groups()
        dest=f'/wiki/{target}' if kind=='article' else target
        count=links.count((dest,normalized(label)))
        if count!=1: issues.append(f'link count={count}: {dest} / {label}')
    return issues, len(blocks),len(content['sections']),len(doc['selected_exact_tokens'])


def fixture_html(doc, photo=True):
    # Representative of app/wiki/[slug]/page.tsx + WikiArticleRender.tsx.
    c=doc['content']
    def linkified(s):
        def replace(m):
            kind,target,label=m.groups()
            href=f'/wiki/{target}' if kind=='article' else target
            return f'<a href="{href}">{html.escape(label)}</a>'
        parts=[];prev=0
        for m in INLINE.finditer(s):
            parts.append(html.escape(s[prev:m.start()]));parts.append(replace(m));prev=m.end()
        parts.append(html.escape(s[prev:]));return ''.join(parts)
    pieces=['<html><head>',f'<title>{html.escape(c["seo_title"])} | هالیوس</title>',f'<meta name="description" content="{html.escape(c["meta_description"],quote=True)}"/>',f'<link rel="canonical" href="{doc["expected_url"]}" />','</head><body>','<div id="wiki-article-content">','<header>',f'<h1>{html.escape(c["title"])}</h1>',f'<p>{linkified(c["intro"])}</p>']
    if photo: pieces+=['<figure><img alt="article image" src="/example.webp" /></figure>']
    pieces+=['</header>','<section>','<h2>نکته‌های کلیدی</h2>','<ul>']
    pieces += [f'<li>{linkified(x)}</li>' for x in c['key_points']]
    pieces+=['</ul></section>','<div id="wiki-article-body">']
    for s in c['sections']:
        pieces+=['<section>',f'<h2>{html.escape(s["title"])}</h2>']
        pieces+=[f'<p>{linkified(x)}</p>' for x in s['paragraphs']]
        pieces+=[f'<ul>{"".join("<li>"+linkified(x)+"</li>" for x in s["bullets"])}</ul>'] if s.get('bullets') else []
        pieces+=['</section>']
    if c['sources']:
        pieces+=['<section><h2>منابع و مطالعهٔ بیشتر</h2><ul>']
        pieces += [f'<li>{html.escape(x["label"] if isinstance(x,dict) else x)}</li>' for x in c['sources']]
        pieces+=['</ul></section>']
    pieces+=['</div></div></body></html>']
    return ''.join(pieces)


def main():
    if not ROOT.is_dir(): sys.exit('SAFETY_FATAL | candidate content folder not found')
    docs={k:json.loads((ROOT/(k+'.json')).read_text(encoding='utf-8')) for k in IDS}
    if sys.argv[1:]==['--self-check']:
        failures=[]
        for k,doc in docs.items():
            markup=fixture_html(doc)
            issues,*_=check(doc,markup)
            if issues:failures.append((k,issues[:5]))
            issues_no_image,*_=check(doc,fixture_html(doc,photo=False))
            if issues_no_image:failures.append((k+'-no-image',issues_no_image[:5]))
        if failures:sys.exit('FAIL | FIXTURES '+repr(failures))
        first=docs[IDS[0]]
        good=fixture_html(first)
        checks=[
            ('missing-section',good.replace('<section><h2>'+html.escape(first['content']['sections'][0]['title'])+'</h2>', '<section><h2>BAD SECTION</h2>',1)),
            ('wrong-seo',good.replace(html.escape(first['content']['seo_title']), 'TOTALLY DIFFERENT TITLE',1)),
            ('missing-body',good.replace('id="wiki-article-body"','id="wrong"',1)),
            ('missing-anchor',good.replace('href="/chart"','href="/wrong"',1)),
            ('extra-section',good.replace('</div></div></body></html>', '<section><h2>EXTRA OLD COPY</h2><p>TEXT</p></section></div></div></body></html>')),
        ]
        for label,fixture in checks:
            issues,*_=check(first,fixture)
            if not issues:sys.exit('FAIL | regression missing '+label)
        print('PASS | SELF_CHECK | all 10 approved article fixtures with/without self-closing images; 5 negative regressions')
        return
    if sys.argv[1:]!=['--live']:sys.exit('Usage: python3 scripts/r3-batch01-verify-live.py --self-check|--live')
    failed=0
    for k,doc in docs.items():
        slug=doc['content']['slug']
        try:
            req=Request(doc['expected_url'],headers={'User-Agent':'Halleus-R3-LiveParity/2.0','Cache-Control':'no-cache'})
            with urlopen(req,timeout=25) as response:
                if response.status!=200:raise RuntimeError(f'HTTP {response.status}')
                markup=response.read().decode('utf-8')
            issues,blocks,sections,links=check(doc,markup)
            if issues:
                failed+=1
                print(f'FAIL | {k} | {slug} | '+ '; '.join(issues[:14]))
            else:
                print(f'PASS | {k} | {slug} | blocks={blocks} sections={sections} exact_links={links} SEO=PASS')
        except Exception as exc:
            failed+=1
            print(f'FAIL | {k} | {slug} | {type(exc).__name__}: {exc}')
    print(f'LIVE_PARITY | PASS={len(IDS)-failed} FAIL={failed} TOTAL={len(IDS)}')
    sys.exit(1 if failed else 0)


if __name__=='__main__':main()
