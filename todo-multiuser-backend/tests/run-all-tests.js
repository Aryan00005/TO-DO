const { runPhase1 } = require('./phase1-health');
const { runPhase2 } = require('./phase2-auth');
const { runPhase3 } = require('./phase3-tasks');
const { runPhase4 } = require('./phase4-admin');
const { runPhase5 } = require('./phase5-security');

console.log('\n');
console.log('╔═══════════════════════════════════════════════════════╗');
console.log('║                                                       ║');
console.log('║        🚀 TODO MULTIUSER SYSTEM TEST SUITE 🚀        ║');
console.log('║                                                       ║');
console.log('╚═══════════════════════════════════════════════════════╝');
console.log('\n');

async function runAllTests() {
  const results = {
    phase1: false,
    phase2: false,
    phase3: false,
    phase4: false,
    phase5: false
  };

  try {
    // Phase 1: Health & Database
    results.phase1 = await runPhase1();
    if (!results.phase1) {
      console.log('⚠️  Phase 1 failed. Fix issues before proceeding.\n');
      return results;
    }

    // Phase 2: Authentication
    const phase2Result = await runPhase2();
    results.phase2 = phase2Result.success;
    if (!results.phase2) {
      console.log('⚠️  Phase 2 failed. Fix authentication issues before proceeding.\n');
      return results;
    }

    // Phase 3: Task CRUD
    results.phase3 = await runPhase3();
    if (!results.phase3) {
      console.log('⚠️  Phase 3 failed. Fix task operations before proceeding.\n');
    }

    // Phase 4: Admin & Roles
    results.phase4 = await runPhase4();
    if (!results.phase4) {
      console.log('⚠️  Phase 4 failed. Fix admin operations.\n');
    }

    // Phase 5: Security & Notifications
    results.phase5 = await runPhase5();
    if (!results.phase5) {
      console.log('⚠️  Phase 5 failed. Review security measures.\n');
    }

  } catch (error) {
    console.error('❌ Test suite error:', error.message);
  }

  // Final Summary
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║                  FINAL TEST SUMMARY                   ║');
  console.log('╚═══════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`  Phase 1 - Health & Database:     ${results.phase1 ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`  Phase 2 - Authentication:        ${results.phase2 ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`  Phase 3 - Task CRUD:             ${results.phase3 ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`  Phase 4 - Admin & Roles:         ${results.phase4 ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`  Phase 5 - Security & Notifs:     ${results.phase5 ? '✅ PASSED' : '❌ FAILED'}`);
  console.log('');

  const allPassed = Object.values(results).every(r => r);
  const passedCount = Object.values(results).filter(r => r).length;
  const totalCount = Object.keys(results).length;

  console.log(`  Overall: ${passedCount}/${totalCount} phases passed`);
  console.log('');
  
  if (allPassed) {
    console.log('  🎉 ALL TESTS PASSED! System is ready for deployment.');
  } else {
    console.log('  ⚠️  Some tests failed. Review the logs above.');
  }
  
  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('\n');

  return results;
}

if (require.main === module) {
  runAllTests().then(results => {
    const allPassed = Object.values(results).every(r => r);
    process.exit(allPassed ? 0 : 1);
  });
}

module.exports = { runAllTests };
