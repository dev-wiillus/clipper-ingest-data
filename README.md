자동화할 때, 매일 크롤링한다는 가정하에 게시물의 발행일이 하루 이내면 모두 가져온다고 생각하면 굳이 rss를 쓸 필요도 없지 않을까?

gpt-4가 이미지를 처리할 수 있으면 pdf를 이미지로 변경해서 읽히게 하면
내용을 이해할까? 토큰 소비량은?

gpt-4가 사이트의 콘텐츠를 읽을 수 있나? 토큰 소비량은?

1. rss로 웹사이트 별로 최신 자료 메타데이터 수집 -> db insert
2. 데이터 원본을 vector store(pinecone)에 저장 -> file도 store에 저장
3. 매일 특정시간에 수집하도록 자동화

\*\* 발행시간을 특정 시간으로 한정하면 최신 자료만 가져오는 것 가능
