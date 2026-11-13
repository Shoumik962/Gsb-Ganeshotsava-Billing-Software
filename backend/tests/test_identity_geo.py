from app.routes_sevadar import haversine_km

def create_devotee(client,auth,first,last,phone):
    response=client.post('/api/devotees',headers=auth,json={'first_name':first,'last_name':last,'phone':phone})
    assert response.status_code==201,response.text
    return response.json()

def test_auth_protected_and_separate_family_identity(client,auth):
    assert client.get('/api/devotees').status_code==401
    a=create_devotee(client,auth,'Anita','Kamath','9876543210')
    b=create_devotee(client,auth,'Anaya','Kamath','9876543210')
    assert a['id']!=b['id']
    assert a['devotee_code']!=b['devotee_code']
    # Shared contact should never merge distinct first names.
    assert b['potential_duplicate_count']==0
    family=client.post('/api/families',headers=auth,json={'name':'Kamath family','head_devotee_id':a['id']}).json()
    assert family['family_code'].startswith('FAM-')
    result=client.post(f"/api/families/{family['id']}/members",headers=auth,json={'devotee_id':b['id'],'relationship':'child'})
    assert result.status_code==201
    assert len(client.get('/api/families',headers=auth).json()[0]['members'])==2

def test_duplicates_are_review_only_and_merge_is_audited(client,auth):
    a=create_devotee(client,auth,'Asha','Pai','9000000001')
    b=create_devotee(client,auth,'Asha','Pai','9000000001')
    assert b['potential_duplicate_count']>=1
    candidates=client.get('/api/dedup/candidates',headers=auth).json()
    assert len(candidates)==1
    cid=candidates[0]['id']
    attempted=client.post(f'/api/dedup/candidates/{cid}/decision',headers=auth,json={
        'decision':'merge','survivor_devotee_id':a['id'],'reason':'same person confirmed through documents'})
    assert attempted.status_code==422
    reviewed=client.post(f'/api/dedup/candidates/{cid}/decision',headers=auth,json={
        'decision':'merge','survivor_devotee_id':a['id'],'confirmed_same_person':True,
        'reason':'Same person verified by administrator against source records'})
    assert reviewed.status_code==200,reviewed.text
    active=client.get('/api/devotees',headers=auth).json()
    assert len(active)==1 and active[0]['id']==a['id']
    assert client.post(f'/api/dedup/candidates/{cid}/decision',headers=auth,json={
        'decision':'reject','reason':'cannot repeat review'}).status_code==409

def test_address_reuse_consent_and_gps_nearby(client,auth):
    person=create_devotee(client,auth,'Vinay','Rao','9000000101')
    family=client.post('/api/families',headers=auth,json={'name':'Rao house','head_devotee_id':person['id']}).json()
    req={'unit':'12A','building':'Sagar','street':'Station Rd','locality':'Wadala','city':'Mumbai','state':'Maharashtra','pincode':'400031'}
    address=client.post('/api/addresses',headers=auth,json=req).json()
    same=client.post('/api/addresses',headers=auth,json={**req,'building':'  SAGAR  '}).json()
    assert same['id']==address['id'] and same['reused']
    other=client.post('/api/addresses',headers=auth,json={**req,'unit':'12B'}).json()
    assert other['id']!=address['id']
    assert client.post(f"/api/families/{family['id']}/addresses",headers=auth,json={'address_id':address['id']}).status_code==200
    assert client.patch(f"/api/addresses/{address['id']}/verify",headers=auth,
                        json={'latitude':19.017,'longitude':72.857,'accuracy_m':15,'source':'site survey'}).status_code==200
    worker=client.post('/api/admin/users',headers=auth,json={'username':'sevadar1','password':'verysecure123456','role':'sevadar','zone':'Wadala'})
    assert worker.status_code==201,worker.text
    access=client.post('/api/auth/login',json={'username':'sevadar1','password':'verysecure123456'}).json()['access_token']
    sev_auth={'Authorization':f'Bearer {access}'}
    assert client.get('/api/sevadars/me/nearby',headers=sev_auth).status_code==409
    assert client.post('/api/sevadars/me/location',headers=sev_auth,json={
        'latitude':19.017,'longitude':72.857,'accuracy_m':12,'consent':False}).status_code==422
    assert client.post('/api/sevadars/me/location',headers=sev_auth,json={
        'latitude':19.017,'longitude':72.857,'accuracy_m':12,'consent':True}).status_code==200
    # Must remain hidden without family consent.
    assert client.get('/api/sevadars/me/nearby',headers=sev_auth).json()==[]
    assert client.post(f"/api/families/{family['id']}/visit-consent",headers=auth,json={
        'consent':True,'source':'in_person','evidence_ref':'Consent form 2026-01'}).status_code==200
    hits=client.get('/api/sevadars/me/nearby?radius_km=1',headers=sev_auth).json()
    assert len(hits)==1 and hits[0]['family_id']==family['id'] and hits[0]['distance_km']==0
    assignment=client.post('/api/sevadars/me/assignments',headers=sev_auth,json={
        'family_id':family['id'],'address_id':address['id']}).json()
    assert 'id' in assignment,assignment
    visit=client.post('/api/sevadars/me/assignments/'+assignment['id']+'/visits',headers=sev_auth,json={
        'outcome':'completed','notes':'Family visited'}).json()
    assert visit['assignment_status']=='completed'
    client.post(f"/api/families/{family['id']}/visit-consent",headers=auth,json={
        'consent':False,'source':'withdrawal','evidence_ref':'Request on call'})
    assert client.get('/api/sevadars/me/nearby?radius_km=1',headers=sev_auth).json()==[]
    client.delete('/api/sevadars/me/location',headers=sev_auth)
    assert client.get('/api/sevadars/me/nearby',headers=sev_auth).status_code==409

def test_haversine_distance():
    assert haversine_km(19.017,72.857,19.017,72.857)==0
    assert 0.1<haversine_km(19.017,72.857,19.019,72.858)<0.3

def test_family_suggestion_is_based_on_exact_unit_not_same_building(client,auth):
    head=create_devotee(client,auth,'Ramesh','Kamath','9000000111')
    new=create_devotee(client,auth,'Vivek','Kamath','9000000222')
    family=client.post('/api/families',headers=auth,json={'name':'Kamath residence','head_devotee_id':head['id']}).json()
    base={'unit':'33','building':'Om Residency','street':'Lane 2','locality':'Wadala','city':'Mumbai','state':'Maharashtra','pincode':'400031'}
    addr=client.post('/api/addresses',headers=auth,json=base).json()
    client.post(f"/api/families/{family['id']}/addresses",headers=auth,json={'address_id':addr['id']})
    other=client.post('/api/addresses',headers=auth,json={**base,'unit':'34'}).json()
    client.post(f"/api/devotees/{new['id']}/addresses",headers=auth,json={'address_id':other['id']})
    assert client.get(f"/api/devotees/{new['id']}/family-suggestions",headers=auth).json()==[]
    client.post(f"/api/devotees/{new['id']}/addresses",headers=auth,json={'address_id':addr['id']})
    hints=client.get(f"/api/devotees/{new['id']}/family-suggestions",headers=auth).json()
    assert hints[0]['family_id']==family['id'] and 'shared exact unit address' in hints[0]['reasons']
    assert client.get('/api/families',headers=auth).json()[0]['members']==[{'devotee_id':head['id'],'relationship':'head'}]


def test_sevadar_cannot_register_devotees(client,auth):
    result=client.post('/api/admin/users',headers=auth,json={'username':'fieldstaff','password':'TestPass333333','role':'sevadar'})
    assert result.status_code==201
    token=client.post('/api/auth/login',json={'username':'fieldstaff','password':'TestPass333333'}).json()['access_token']
    denied=client.post('/api/devotees',headers={'Authorization':'Bearer '+token},json={'first_name':'Anita','phone':'9000000001'})
    assert denied.status_code==403
