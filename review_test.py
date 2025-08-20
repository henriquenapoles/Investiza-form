#!/usr/bin/env python3
"""
Review Request Specific Tests
Tests the new data structure changes as requested
"""

import requests
import json
from datetime import datetime
import uuid

class ReviewTester:
    def __init__(self):
        self.base_url = "https://64f9e230-877c-4eee-a350-0f4d8e9ba397.preview.emergentagent.com"
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'User-Agent': 'ReviewTester/1.0'
        })
        self.tests_run = 0
        self.tests_passed = 0

    def run_test(self, name, method, endpoint, expected_status, data=None):
        """Run a single test"""
        url = f"{self.base_url}/{endpoint}"
        self.tests_run += 1
        print(f"\n🔍 {name}")
        print(f"   URL: {url}")
        
        try:
            if method == 'POST':
                response = self.session.post(url, json=data, timeout=15)
            else:
                response = self.session.get(url, timeout=15)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ PASSED - Status: {response.status_code}")
                if response.headers.get('content-type', '').startswith('application/json'):
                    response_data = response.json()
                    print(f"   Response: {json.dumps(response_data, indent=2)[:300]}...")
                else:
                    print(f"   Response: {response.text[:200]}...")
            else:
                print(f"❌ FAILED - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:500]}")

            return success, response.json() if response.headers.get('content-type', '').startswith('application/json') else response.text

        except Exception as e:
            print(f"❌ FAILED - Error: {str(e)}")
            return False, {}

    def test_validate_endpoint_new_structure(self):
        """Test /api/form/validate with new data structure"""
        test_data = {
            "nome": "João Teste",
            "email": "joao@teste.com", 
            "whatsapp": "+55 11 99999-9999",
            "como_chegou": "google",
            "situacao_empresa": "cnpj_antigo",
            "faturamento_renda": "10-80",
            "local": "Sudeste",
            "municipio_estado": "São Paulo, SP",
            "segmento": ["Tecnologia"],
            "razao": ["Ampliacao", "Giro"],
            "garantia": ["Imovel Residencial", "Imovel Rural", "Recebiveis"],
            "tipos_imovel_detalhado": ["Residencial", "Rural"]
        }
        
        return self.run_test(
            "Testing /api/form/validate with new structure",
            "POST",
            "api/form/validate",
            200,
            data=test_data
        )

    def test_validate_endpoint_tipos_imovel_array(self):
        """Test /api/form/validate with tipos_imovel as array"""
        test_data = {
            "nome": "Maria Silva",
            "email": "maria@teste.com", 
            "whatsapp": "+55 11 88888-8888",
            "como_chegou": "instagram",
            "situacao_empresa": "cnpj_novo",
            "faturamento_renda": ">80",
            "local": "Nordeste",
            "segmento": ["Construtora"],
            "razao": ["Ampliacao"],
            "garantia": ["Recebiveis", "Veiculo"],
            "tipos_imovel": ["Residencial", "Comercial"],  # Array format
            "tipos_imovel_detalhado": ["Residencial", "Comercial"]
        }
        
        return self.run_test(
            "Testing /api/form/validate with tipos_imovel as array",
            "POST",
            "api/form/validate",
            200,
            data=test_data
        )

    def test_webhook_endpoint_new_structure(self):
        """Test /api/form/webhook with new data structure"""
        # First, let's set a valid webhook URL
        webhook_update = {
            "webhook_url": "https://2n8n.ominicrm.com/webhook-test/650b310d-cd0b-465a-849d-7c7a3991572e"
        }
        
        # Update webhook URL first
        self.run_test(
            "Setting valid webhook URL",
            "POST",
            "api/admin/webhook",
            200,
            data=webhook_update
        )
        
        # Now test the webhook with new structure
        webhook_data = {
            "source": "investiza-form-gamificado",
            "idempotency_key": str(uuid.uuid4()),
            "timestamp": datetime.utcnow().isoformat(),
            "lead": {
                "nome": "João Teste",
                "email": "joao@teste.com", 
                "whatsapp": "+55 11 99999-9999",
                "como_chegou": "google",
                "situacao_empresa": "cnpj_antigo",
                "faturamento_renda": "10-80",
                "local": "Sudeste",
                "municipio_estado": "São Paulo, SP",
                "segmento": ["Tecnologia"],
                "razao": ["Ampliacao", "Giro"],
                "garantia": ["Imovel Residencial", "Imovel Rural", "Recebiveis"],
                "tipos_imovel_detalhado": ["Residencial", "Rural"]
            },
            "eligibility": {
                "recomendados": ["ASIA", "SB"],
                "possiveis_atipicos": [],
                "nao_elegiveis": [
                    {"id": "BNB_FNE", "motivo": "Região não atendida"}
                ]
            },
            "score_gamificado": 75,
            "meta": {
                "user_agent": "ReviewTester/1.0",
                "utm_source": "test",
                "page_url": "https://test.com"
            }
        }
        
        return self.run_test(
            "Testing /api/form/webhook with new structure",
            "POST",
            "api/form/webhook",
            200,
            data=webhook_data
        )

    def test_optional_fields_acceptance(self):
        """Test that optional fields are accepted"""
        test_data = {
            "nome": "Carlos Oliveira",
            "nome_empresa": "Oliveira Tech Ltda",  # Optional
            "email": "carlos@oliveira.com", 
            "whatsapp": "+55 21 77777-7777",
            "instagram": "@oliveira_tech",  # Optional
            "como_chegou": "indicacao",
            "indicacao_detalhes": "Indicado por amigo",
            "situacao_empresa": "cnpj_antigo",
            "faturamento_renda": ">300",
            "local": "Sudeste",
            "municipio_estado": "Rio de Janeiro, RJ",
            "segmento": ["Tecnologia", "Outros"],
            "segmento_outros": "Desenvolvimento de Software",
            "razao": ["Giro", "Financiamento_Ativo"],
            "razao_outros": "Expansão internacional",  # Optional
            "garantia": ["Recebiveis", "Veiculo"],
            "tipos_imovel": [],  # Optional - empty array
            "tipos_imovel_detalhado": []  # Optional - empty array
        }
        
        return self.run_test(
            "Testing optional fields acceptance",
            "POST",
            "api/form/validate",
            200,
            data=test_data
        )

    def test_processed_guarantees(self):
        """Test processed guarantees like 'Imovel Residencial', 'Imovel Rural'"""
        test_data = {
            "nome": "Ana Costa",
            "email": "ana@costa.com", 
            "whatsapp": "+55 85 66666-6666",
            "como_chegou": "facebook",
            "situacao_empresa": "pessoa_fisica",
            "faturamento_renda": "15k_50k",
            "local": "Nordeste",
            "segmento": ["Agro"],
            "razao": ["Implantacao"],
            "garantia": ["Imovel Residencial", "Imovel Rural", "Equipamento"],  # Processed guarantees
            "tipos_imovel_detalhado": ["Residencial", "Rural"]
        }
        
        return self.run_test(
            "Testing processed guarantees",
            "POST",
            "api/form/validate",
            200,
            data=test_data
        )

    def run_all_tests(self):
        """Run all review-specific tests"""
        print("🎯 REVIEW REQUEST SPECIFIC TESTS")
        print("Testing backend endpoints after data structure changes")
        print("=" * 70)

        # Test 1: /api/form/validate with new fields
        print("\n📋 TESTING /api/form/validate ENDPOINT")
        self.test_validate_endpoint_new_structure()
        self.test_validate_endpoint_tipos_imovel_array()
        
        # Test 2: /api/form/webhook with new structure
        print("\n📋 TESTING /api/form/webhook ENDPOINT")
        self.test_webhook_endpoint_new_structure()
        
        # Test 3: Optional fields and processed guarantees
        print("\n📋 TESTING OPTIONAL FIELDS AND PROCESSED GUARANTEES")
        self.test_optional_fields_acceptance()
        self.test_processed_guarantees()

        # Results
        print("\n" + "=" * 70)
        print(f"📊 REVIEW TEST RESULTS")
        print(f"   Tests Run: {self.tests_run}")
        print(f"   Tests Passed: {self.tests_passed}")
        print(f"   Tests Failed: {self.tests_run - self.tests_passed}")
        print(f"   Success Rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        if self.tests_passed == self.tests_run:
            print("✅ ALL REVIEW TESTS PASSED - New data structure working correctly!")
            return 0
        else:
            print(f"❌ {self.tests_run - self.tests_passed} TESTS FAILED - Issues detected")
            return 1

if __name__ == "__main__":
    tester = ReviewTester()
    exit_code = tester.run_all_tests()
    exit(exit_code)