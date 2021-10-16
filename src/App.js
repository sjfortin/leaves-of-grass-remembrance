import "./styles/App.css";
import twitterLogo from "./assets/twitter-logo.svg";
import React, { useEffect, useState, useCallback } from "react";
import { ethers } from "ethers";
import LeavesOfGrassRemembrance from "./utils/LeavesOfGrassRemembrance.json";
import CircleLoader from "react-spinners/CircleLoader";

// Constants
const TWITTER_HANDLE = "sjfortin";
const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`;
const LIMIT = 50;
const CONTRACT_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS;
const COLLECTION_ON_OPEN_SEA = "squarenft-yxwem3h1yw";

const App = () => {
  const [currentAccount, setCurrentAccount] = useState("");
  const [numberOfMints, setNumberOfMints] = useState(0);
  const [mintLimitReached, setMintLimitReached] = useState(false);
  const [openSeaNFTLink, setOpenSeaNFTLink] = useState("");
  const [isMining, setIsMining] = useState(false);
  const [isPayingGas, setIsPayingGas] = useState(false);
  const [isRinkeby, setIsRinkeby] = useState(false);

  const { ethereum } = window;

  // Setup our listener.
  const setupEventListener = useCallback(async () => {
    // Most of this looks the same as our function askContractToMintNft
    try {
      if (ethereum) {
        const provider = new ethers.providers.Web3Provider(ethereum);
        const signer = provider.getSigner();
        const connectedContract = new ethers.Contract(
          CONTRACT_ADDRESS,
          LeavesOfGrassRemembrance.abi,
          signer
        );
        // THIS IS THE MAGIC SAUCE.
        // This will essentially "capture" our event when our contract throws it.
        // If you're familiar with webhooks, it's very similar to that!
        connectedContract.on("NewEpicNFTMinted", (from, tokenId) => {
          console.log(from, tokenId.toNumber());
          setOpenSeaNFTLink(
            `https://testnets.opensea.io/assets/${CONTRACT_ADDRESS}/${tokenId.toNumber()}`
          );
          alert(
            `Hey there! We've minted your NFT. It may be blank right now. It can take a max of 10 min to show up on OpenSea. Here's the link: https://testnets.opensea.io/assets/${CONTRACT_ADDRESS}/${tokenId.toNumber()}`
          );
        });

        console.log("Setup event listener!");
      } else {
        console.log("Ethereum object doesn't exist!");
      }
    } catch (error) {
      console.log(error);
    }
  }, [ethereum]);

  /*
   * Gotta make sure this is async.
   */
  const checkIfWalletIsConnected = useCallback(async () => {
    if (!ethereum) {
      return;
    }

    /*
     * Check if we're authorized to access the user's wallet
     */
    const accounts = await ethereum.request({ method: "eth_accounts" });

    /*
     * User can have multiple authorized accounts, we grab the first one if its there!
     */
    if (accounts.length) {
      const account = accounts[0];
      console.log("Found an authorized account:", account);
      setCurrentAccount(account);
      setupEventListener();
    } else {
      console.log("No authorized account found");
    }
  }, [setupEventListener, ethereum]);

  const checkNumberOfMints = useCallback(async () => {
    if (!ethereum || !isRinkeby) {
      return;
    }

    const provider = new ethers.providers.Web3Provider(ethereum);
    const signer = provider.getSigner();
    const connectedContract = new ethers.Contract(
      CONTRACT_ADDRESS,
      LeavesOfGrassRemembrance.abi,
      signer
    );

    const numberOfMintsFromContract = await connectedContract.getTotalMints();

    setNumberOfMints(numberOfMintsFromContract.toNumber());
  }, [ethereum, isRinkeby]);

  const checkRinkeby = useCallback(async () => {
    if (!ethereum) {
      return;
    }

    let chainId = await ethereum.request({ method: "eth_chainId" });
    console.log("Connected to chain " + chainId);

    // String, hex code of the chainId of the Rinkebey test network
    const rinkebyChainId = "0x4";
    if (chainId !== rinkebyChainId) {
      setIsRinkeby(false);
    } else {
      setIsRinkeby(true);
    }
  }, [ethereum]);

  /*
   * Implement your connectWallet method here
   */
  const connectWallet = async () => {
    try {
      if (!ethereum) {
        alert("Get MetaMask!");
        return;
      }

      /*
       * Fancy method to request access to account.
       */
      const accounts = await ethereum.request({
        method: "eth_requestAccounts",
      });

      /*
       * Boom! This should print out public address once we authorize Metamask.
       */
      console.log("Connected", accounts[0]);
      setCurrentAccount(accounts[0]);
    } catch (error) {
      console.log(error);
    }
  };

  const askContractToMintNft = async () => {
    try {
      if (ethereum) {
        const provider = new ethers.providers.Web3Provider(ethereum);
        const signer = provider.getSigner();
        const connectedContract = new ethers.Contract(
          CONTRACT_ADDRESS,
          LeavesOfGrassRemembrance.abi,
          signer
        );

        const numberOfMintsFromContract =
          await connectedContract.getTotalMints();

        setNumberOfMints(numberOfMintsFromContract.toNumber());

        if (numberOfMints < LIMIT) {
          setMintLimitReached(false);
          setIsPayingGas(true);
          console.log("Going to pop wallet now to pay gas...");
          let nftTxn = await connectedContract.makeAnEpicNFT();

          console.log("Mining...please wait.");
          setIsPayingGas(false);
          setIsMining(true);
          await nftTxn.wait();

          console.log(
            `Mined, see transaction: https://rinkeby.etherscan.io/tx/${nftTxn.hash}`
          );

          setIsMining(false);
          checkNumberOfMints();
        } else {
          setMintLimitReached(true);
          console.log("Sorry! The max number of leaves has been reached.");
        }
      } else {
        console.log("Ethereum object doesn't exist!");
      }
    } catch (error) {
      console.log(error);
    }
  };

  /*
   * This runs our function when the page loads.
   */
  useEffect(() => {
    checkIfWalletIsConnected();
  }, [checkIfWalletIsConnected]);

  useEffect(() => {
    if (currentAccount) {
      checkNumberOfMints();
    }
  }, [checkNumberOfMints, currentAccount]);

  useEffect(() => {
    if (currentAccount) {
      checkRinkeby();
    }
  }, [currentAccount, checkRinkeby]);

  useEffect(() => {
    if (numberOfMints >= LIMIT) {
      setMintLimitReached(true);
    }
  }, [numberOfMints]);

  return (
    <div className="App">
      <div className="container">
        <div className="header-container">
          <h1 className="header gradient-text">Leaves of Grass Remembrance</h1>
          <p className="sub-text">
            See ever so far, there is limitless space outside of that.
          </p>
          <div>
            {!mintLimitReached && (
              <div className="mint-count">
                <div>
                  {numberOfMints} out of {LIMIT} leaves of grass claimed. <br />
                  Go forth and claim yours.
                </div>
              </div>
            )}
            {mintLimitReached && (
              <div className="mint-level-reached">
                Unless the limit is reached. Sorry! The leaves are gone for the
                winter.
              </div>
            )}
            {!mintLimitReached && (
              <>
                {currentAccount === "" ? (
                  <button
                    onClick={connectWallet}
                    className="cta-button connect-wallet-button"
                  >
                    Connect to Wallet
                  </button>
                ) : (
                  <>
                    {isPayingGas && (
                      <div className="status">
                        Pay that gas fee to continue forth!
                      </div>
                    )}
                    {isMining && (
                      <div className="miningLoader">
                        <CircleLoader
                          loading={isMining}
                          size={150}
                          color="#00FFFF"
                        />
                      </div>
                    )}
                    {!isMining && !isPayingGas && isRinkeby && (
                      <button
                        onClick={askContractToMintNft}
                        className="cta-button connect-wallet-button"
                      >
                        Mint your leaves
                      </button>
                    )}
                    {!isRinkeby && (
                      <div className="no-rinkeby">
                        Yooooo! You have to connect to Rinkeby to proceed.
                        Refresh the page when you do.
                      </div>
                    )}
                  </>
                )}
                {openSeaNFTLink && !isMining && !isPayingGas && (
                  <div className="open-sea-nft-link">
                    <div>They are but parts, any thing is but a part.</div>
                    <div>
                      {" "}
                      <a href={openSeaNFTLink} target="_blank" rel="noreferrer">
                        Check out your part!
                      </a>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
          <div className="view-collection-container">
            <a
              className="view-collection"
              href={`https://testnets.opensea.io/collection/${COLLECTION_ON_OPEN_SEA}`}
              target="_blank"
              rel="noreferrer"
            >
              🌊 View Collection on OpenSea
            </a>
          </div>
        </div>
        <div className="footer-container">
          <img alt="Twitter Logo" className="twitter-logo" src={twitterLogo} />
          <a
            className="footer-text"
            href={TWITTER_LINK}
            target="_blank"
            rel="noreferrer"
          >{`@${TWITTER_HANDLE}`}</a>
        </div>
      </div>
    </div>
  );
};

export default App;
