# Repository Rules

## Protected Branch
- **Main branch**: `main`

## Requirements for Merges into `main`
- At least **1 approved code review** is required.
- All mandatory GitHub Actions workflows must pass:
  - **Lint & Format**
  - **Build Verification**
  - **Test All**
- **Direct commits to `main` are prohibited**. All changes must go through pull requests.
- **Squash merging** is required to maintain a clean history.
- **Signed commits** are recommended to ensure author authenticity.

## Example GitHub Settings Configuration
Navigate to **Settings → Branches → main → Protect** and enable the following:
1. **Require a pull request before merging** with at least one approving review.
2. **Require status checks to pass before merging** and select:
   - `Lint & Format`
   - `Build Verification`
   - `Test All`
3. Enable **Require branches to be up to date before merging**.
4. Enable **Allow squash merging** and disable other merge strategies as needed.
5. (Optional) Enable **Require signed commits**.
